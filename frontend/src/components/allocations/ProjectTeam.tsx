import React, { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { 
  BriefcaseIcon, 
  UsersIcon, 
  ClockIcon, 
  UserPlusIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AllocationCard } from './AllocationCard';
import { useProjectTeamAllocation } from '@/hooks/useAllocations';
import type { Allocation } from '@/types/allocation';

interface ProjectTeamProps {
  projectId: string;
  projectName?: string;
  onAllocationClick?: (allocation: Allocation) => void;
  onAllocationEdit?: (allocation: Allocation) => void;
  onAllocationDelete?: (allocation: Allocation) => void;
  onAddTeamMember?: (projectId: string) => void;
  className?: string;
}

interface TeamMemberCardProps {
  member: {
    employeeId: string;
    employeeName: string;
    role: string;
    allocatedHours: number;
    allocation: Allocation;
  };
  onAllocationClick?: (allocation: Allocation) => void;
  onAllocationEdit?: (allocation: Allocation) => void;
  onAllocationDelete?: (allocation: Allocation) => void;
}

function TeamMemberCard({ 
  member, 
  onAllocationClick, 
  onAllocationEdit, 
  onAllocationDelete 
}: TeamMemberCardProps) {
  const allocation = member.allocation;
  const startDate = parseISO(allocation.startDate);
  const endDate = parseISO(allocation.endDate);
  
  const isActive = allocation.status === 'active';
  const isOverdue = allocation.isOverdue;
  const isUpcoming = allocation.isUpcoming;
  
  // Calculate utilization percentage (assuming 40h work week)
  const utilizationPercent = Math.min(100, (member.allocatedHours / 40) * 100);

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                {member.employeeName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <h4 className="font-semibold text-gray-900">{member.employeeName}</h4>
              <p className="text-sm text-gray-600">{member.role}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isOverdue && <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />}
            {allocation.status === 'completed' && <CheckCircleIcon className="h-4 w-4 text-green-500" />}
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {allocation.status}
            </Badge>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {/* Hours and Duration */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-gray-600">
              <ClockIcon className="h-4 w-4 mr-1" />
              <span>{member.allocatedHours}h/week</span>
            </div>
            
            <div className="text-gray-500">
              {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
            </div>
          </div>

          {/* Utilization Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Utilization</span>
              <span>{Math.round(utilizationPercent)}%</span>
            </div>
            <Progress 
              value={utilizationPercent} 
              className={`h-2 ${utilizationPercent > 100 ? 'bg-red-100' : ''}`}
            />
            {utilizationPercent > 100 && (
              <div className="text-xs text-red-600">Overallocated</div>
            )}
          </div>

          {/* Status indicators */}
          {isUpcoming && (
            <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              Starts {format(startDate, 'MMM d')}
            </div>
          )}

          {isOverdue && (
            <div className="flex items-center text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
              <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
              Overdue
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAllocationClick?.(allocation)}
              className="text-xs flex-1"
            >
              View Details
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAllocationEdit?.(allocation)}
              className="text-xs"
            >
              Edit
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProjectTeam({
  projectId,
  projectName,
  onAllocationClick,
  onAllocationEdit,
  onAllocationDelete,
  onAddTeamMember,
  className = ""
}: ProjectTeamProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch project team data
  const { data: teamData, isLoading, error } = useProjectTeamAllocation(projectId);

  // Calculate team statistics
  const teamStats = useMemo(() => {
    if (!teamData) return null;

    const totalHours = teamData.totalAllocatedHours;
    const avgHoursPerMember = teamData.teamMembers.length > 0 
      ? totalHours / teamData.teamMembers.length 
      : 0;

    const activeMembers = teamData.teamMembers.filter(member => 
      member.allocation.status === 'active'
    ).length;

    const overallocatedMembers = teamData.teamMembers.filter(member =>
      member.allocatedHours > 40 // Assuming 40h work week
    ).length;

    const completedAllocations = teamData.teamMembers.filter(member =>
      member.allocation.status === 'completed'
    ).length;

    return {
      totalMembers: teamData.teamMembers.length,
      activeMembers,
      completedAllocations,
      overallocatedMembers,
      totalHours,
      avgHoursPerMember: Math.round(avgHoursPerMember * 10) / 10,
      missingSkillsCount: teamData.missingSkills?.length || 0,
    };
  }, [teamData]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-red-600">Failed to load team data</p>
            <p className="text-sm text-gray-500 mt-2">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!teamData) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-gray-500">No team data found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="flex items-center">
            <BriefcaseIcon className="mr-2 h-5 w-5" />
            {projectName ? `${projectName} - Team` : 'Project Team'}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddTeamMember?.(projectId)}
            >
              <UserPlusIcon className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </div>
        </div>

        {/* Project Info */}
        {teamData.clientName && (
          <p className="text-sm text-gray-600">
            Client: {teamData.clientName}
          </p>
        )}
      </CardHeader>

      <CardContent>
        {/* Team Statistics */}
        {teamStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center p-3 bg-blue-50 rounded-lg">
              <UsersIcon className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <div className="text-sm font-medium text-blue-900">Total Members</div>
                <div className="text-lg font-bold text-blue-700">{teamStats.totalMembers}</div>
              </div>
            </div>
            
            <div className="flex items-center p-3 bg-green-50 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
              <div>
                <div className="text-sm font-medium text-green-900">Active</div>
                <div className="text-lg font-bold text-green-700">{teamStats.activeMembers}</div>
              </div>
            </div>
            
            <div className="flex items-center p-3 bg-purple-50 rounded-lg">
              <ClockIcon className="h-5 w-5 text-purple-600 mr-2" />
              <div>
                <div className="text-sm font-medium text-purple-900">Total Hours</div>
                <div className="text-lg font-bold text-purple-700">{teamStats.totalHours}h</div>
              </div>
            </div>
            
            <div className="flex items-center p-3 bg-orange-50 rounded-lg">
              <ChartBarIcon className="h-5 w-5 text-orange-600 mr-2" />
              <div>
                <div className="text-sm font-medium text-orange-900">Avg Hours</div>
                <div className="text-lg font-bold text-orange-700">{teamStats.avgHoursPerMember}h</div>
              </div>
            </div>
          </div>
        )}

        {/* Missing Skills Alert */}
        {teamData.missingSkills && teamData.missingSkills.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center mb-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
              <h4 className="text-sm font-medium text-yellow-800">Missing Skills</h4>
            </div>
            <div className="text-sm text-yellow-700">
              The following skills are required but not covered by current team members:
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {teamData.missingSkills.map((skill, index) => (
                <Badge key={index} variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Overallocation Alert */}
        {teamStats && teamStats.overallocatedMembers > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
              <div className="text-sm text-red-700">
                <span className="font-medium">{teamStats.overallocatedMembers}</span> team member{teamStats.overallocatedMembers !== 1 ? 's are' : ' is'} overallocated
              </div>
            </div>
          </div>
        )}

        {/* Team Members */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
            {teamData.teamMembers.length > 0 && (
              <div className="text-sm text-gray-500">
                {teamData.teamMembers.length} member{teamData.teamMembers.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {teamData.teamMembers.length > 0 ? (
            <div className={`grid gap-4 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                : 'grid-cols-1'
            }`}>
              {teamData.teamMembers.map((member) => (
                <TeamMemberCard
                  key={member.employeeId}
                  member={member}
                  onAllocationClick={onAllocationClick}
                  onAllocationEdit={onAllocationEdit}
                  onAllocationDelete={onAllocationDelete}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No team members</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first team member to this project.
              </p>
              <div className="mt-6">
                <Button onClick={() => onAddTeamMember?.(projectId)}>
                  <UserPlusIcon className="h-4 w-4 mr-2" />
                  Add Team Member
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Required Skills */}
        {teamData.requiredSkills && teamData.requiredSkills.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Required Skills</h4>
            <div className="flex flex-wrap gap-2">
              {teamData.requiredSkills.map((skill, index) => {
                const isMissing = teamData.missingSkills?.includes(skill);
                return (
                  <Badge 
                    key={index} 
                    variant={isMissing ? "destructive" : "secondary"}
                    className={isMissing ? "bg-red-100 text-red-800" : ""}
                  >
                    {skill}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
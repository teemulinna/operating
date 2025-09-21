import { apiClient } from '@/services/api';
import type {
  Team,
  TeamTemplate,
  TeamTemplateRole,
  CreateTeamRequest,
  UpdateTeamRequest,
  CreateTeamTemplateRequest,
  UpdateTeamTemplateRequest,
  TeamAssignmentRequest,
  TeamAssignmentResult,
  CapacityPlanningRequest,
  CapacityPlanningResult,
  DepartmentAllocationSummary,
  DepartmentRebalancingRequest,
  DepartmentRebalancingResult,
} from '@/types/bulk-operations';

/**
 * Service for team management and template-based operations
 */
export class TeamManagementService {
  // Team CRUD Operations
  
  /**
   * Get all teams with filtering and pagination
   */
  static async getTeams(params?: {
    departmentId?: string;
    search?: string;
    isActive?: boolean;
    leaderId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    teams: Team[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const response = await apiClient.get<{
      data: {
        teams: Team[];
        pagination: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      };
    }>(`/teams?${queryParams.toString()}`);

    return response.data.data;
  }

  /**
   * Get a single team by ID with full details
   */
  static async getTeam(id: string): Promise<Team> {
    const response = await apiClient.get<{
      data: Team;
    }>(`/teams/${id}`);

    return response.data.data;
  }

  /**
   * Create a new team
   */
  static async createTeam(request: CreateTeamRequest): Promise<Team> {
    const response = await apiClient.post<{
      data: Team;
    }>('/teams', request);

    return response.data.data;
  }

  /**
   * Update an existing team
   */
  static async updateTeam(id: string, request: UpdateTeamRequest): Promise<Team> {
    const response = await apiClient.put<{
      data: Team;
    }>(`/teams/${id}`, request);

    return response.data.data;
  }

  /**
   * Delete a team
   */
  static async deleteTeam(id: string): Promise<void> {
    await apiClient.delete(`/teams/${id}`);
  }

  /**
   * Add members to a team
   */
  static async addTeamMembers(
    teamId: string,
    memberIds: string[]
  ): Promise<Team> {
    const response = await apiClient.post<{
      data: Team;
    }>(`/teams/${teamId}/members`, { memberIds });

    return response.data.data;
  }

  /**
   * Remove members from a team
   */
  static async removeTeamMembers(
    teamId: string,
    memberIds: string[]
  ): Promise<Team> {
    const response = await apiClient.delete<{
      data: Team;
    }>(`/teams/${teamId}/members`, {
      data: { memberIds }
    });

    return response.data.data;
  }

  // Team Template Operations

  /**
   * Get all team templates
   */
  static async getTeamTemplates(params?: {
    departmentId?: string;
    search?: string;
    isActive?: boolean;
    tags?: string[];
  }): Promise<TeamTemplate[]> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(key, v));
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });
    }

    const response = await apiClient.get<{
      data: TeamTemplate[];
    }>(`/team-templates?${queryParams.toString()}`);

    return response.data.data;
  }

  /**
   * Get a single team template by ID
   */
  static async getTeamTemplate(id: string): Promise<TeamTemplate> {
    const response = await apiClient.get<{
      data: TeamTemplate;
    }>(`/team-templates/${id}`);

    return response.data.data;
  }

  /**
   * Create a new team template
   */
  static async createTeamTemplate(
    request: CreateTeamTemplateRequest
  ): Promise<TeamTemplate> {
    const response = await apiClient.post<{
      data: TeamTemplate;
    }>('/team-templates', request);

    return response.data.data;
  }

  /**
   * Update an existing team template
   */
  static async updateTeamTemplate(
    id: string,
    request: UpdateTeamTemplateRequest
  ): Promise<TeamTemplate> {
    const response = await apiClient.put<{
      data: TeamTemplate;
    }>(`/team-templates/${id}`, request);

    return response.data.data;
  }

  /**
   * Delete a team template
   */
  static async deleteTeamTemplate(id: string): Promise<void> {
    await apiClient.delete(`/team-templates/${id}`);
  }

  /**
   * Clone a team template
   */
  static async cloneTeamTemplate(
    id: string,
    newName: string
  ): Promise<TeamTemplate> {
    const response = await apiClient.post<{
      data: TeamTemplate;
    }>(`/team-templates/${id}/clone`, { name: newName });

    return response.data.data;
  }

  // Team Assignment Operations

  /**
   * Assign a team to a project using template or custom roles
   */
  static async assignTeamToProject(
    request: TeamAssignmentRequest
  ): Promise<TeamAssignmentResult> {
    const response = await apiClient.post<{
      data: TeamAssignmentResult;
    }>('/teams/assignments', request);

    return response.data.data;
  }

  /**
   * Get team assignments for a project
   */
  static async getProjectTeamAssignments(
    projectId: string
  ): Promise<TeamAssignmentResult[]> {
    const response = await apiClient.get<{
      data: TeamAssignmentResult[];
    }>(`/projects/${projectId}/team-assignments`);

    return response.data.data;
  }

  /**
   * Get team assignments for a team
   */
  static async getTeamAssignments(
    teamId: string,
    params?: {
      isActive?: boolean;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<TeamAssignmentResult[]> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const response = await apiClient.get<{
      data: TeamAssignmentResult[];
    }>(`/teams/${teamId}/assignments?${queryParams.toString()}`);

    return response.data.data;
  }

  /**
   * Unassign a team from a project
   */
  static async unassignTeamFromProject(
    teamId: string,
    projectId: string
  ): Promise<void> {
    await apiClient.delete(`/teams/${teamId}/assignments/${projectId}`);
  }

  // Capacity Planning and Analysis

  /**
   * Get capacity planning recommendations for a project
   */
  static async getCapacityPlanningRecommendations(
    request: CapacityPlanningRequest
  ): Promise<CapacityPlanningResult> {
    const response = await apiClient.post<{
      data: CapacityPlanningResult;
    }>('/capacity-planning/recommendations', request);

    return response.data.data;
  }

  /**
   * Get team capacity analysis
   */
  static async getTeamCapacityAnalysis(
    teamId: string,
    dateRange?: {
      startDate: string;
      endDate: string;
    }
  ): Promise<{
    capacity: {
      total: number;
      available: number;
      allocated: number;
      utilization: number;
    };
    members: Array<{
      employeeId: string;
      employeeName: string;
      capacity: number;
      allocated: number;
      utilization: number;
      skills: string[];
    }>;
    skillMatrix: {
      skills: Array<{
        name: string;
        coverage: number;
        averageProficiency: number;
      }>;
      gaps: Array<{
        skill: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
      }>;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (dateRange) {
      queryParams.append('startDate', dateRange.startDate);
      queryParams.append('endDate', dateRange.endDate);
    }

    const response = await apiClient.get<{
      data: {
        capacity: {
          total: number;
          available: number;
          allocated: number;
          utilization: number;
        };
        members: Array<{
          employeeId: string;
          employeeName: string;
          capacity: number;
          allocated: number;
          utilization: number;
          skills: string[];
        }>;
        skillMatrix: {
          skills: Array<{
            name: string;
            coverage: number;
            averageProficiency: number;
          }>;
          gaps: Array<{
            skill: string;
            severity: 'low' | 'medium' | 'high' | 'critical';
          }>;
        };
      };
    }>(`/teams/${teamId}/capacity-analysis?${queryParams.toString()}`);

    return response.data.data;
  }

  // Department-level Operations

  /**
   * Get department allocation summary
   */
  static async getDepartmentAllocationSummary(
    departmentId: string,
    dateRange?: {
      startDate: string;
      endDate: string;
    }
  ): Promise<DepartmentAllocationSummary> {
    const queryParams = new URLSearchParams();
    if (dateRange) {
      queryParams.append('startDate', dateRange.startDate);
      queryParams.append('endDate', dateRange.endDate);
    }

    const response = await apiClient.get<{
      data: DepartmentAllocationSummary;
    }>(`/departments/${departmentId}/allocation-summary?${queryParams.toString()}`);

    return response.data.data;
  }

  /**
   * Get department rebalancing recommendations
   */
  static async getDepartmentRebalancingRecommendations(
    request: DepartmentRebalancingRequest
  ): Promise<DepartmentRebalancingResult> {
    const response = await apiClient.post<{
      data: DepartmentRebalancingResult;
    }>('/departments/rebalancing-recommendations', request);

    return response.data.data;
  }

  /**
   * Apply department rebalancing changes
   */
  static async applyDepartmentRebalancing(
    departmentId: string,
    changes: DepartmentRebalancingResult['proposedChanges']
  ): Promise<{
    applied: number;
    failed: Array<{ changeIndex: number; error: string }>;
  }> {
    const response = await apiClient.post<{
      data: {
        applied: number;
        failed: Array<{ changeIndex: number; error: string }>;
      };
    }>(`/departments/${departmentId}/apply-rebalancing`, { changes });

    return response.data.data;
  }

  // Skill Matrix and Matching

  /**
   * Find best team matches for project requirements
   */
  static async findTeamMatches(request: {
    requiredSkills: string[];
    minimumTeamSize: number;
    maximumTeamSize?: number;
    experienceLevel?: 'junior' | 'intermediate' | 'senior' | 'expert';
    departmentIds?: string[];
    excludeTeamIds?: string[];
  }): Promise<Array<{
    teamId: string;
    teamName: string;
    matchScore: number;
    skillMatch: {
      matched: string[];
      missing: string[];
      coverage: number;
    };
    capacity: {
      available: number;
      members: number;
    };
    recommendations: string[];
  }>> {
    const response = await apiClient.post<{
      data: Array<{
        teamId: string;
        teamName: string;
        matchScore: number;
        skillMatch: {
          matched: string[];
          missing: string[];
          coverage: number;
        };
        capacity: {
          available: number;
          members: number;
        };
        recommendations: string[];
      }>;
    }>('/teams/find-matches', request);

    return response.data.data;
  }

  /**
   * Get skill matrix for multiple teams
   */
  static async getMultiTeamSkillMatrix(
    teamIds: string[]
  ): Promise<Record<string, {
    skills: Array<{
      name: string;
      category: string;
      coverage: number;
      averageProficiency: number;
    }>;
    gaps: Array<{
      skill: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }>;
  }>> {
    const queryParams = new URLSearchParams();
    teamIds.forEach(id => queryParams.append('teamIds', id));

    const response = await apiClient.get<{
      data: Record<string, {
        skills: Array<{
          name: string;
          category: string;
          coverage: number;
          averageProficiency: number;
        }>;
        gaps: Array<{
          skill: string;
          severity: 'low' | 'medium' | 'high' | 'critical';
        }>;
      }>;
    }>(`/teams/skill-matrix?${queryParams.toString()}`);

    return response.data.data;
  }

  // Template-based Team Creation

  /**
   * Create a team from a template
   */
  static async createTeamFromTemplate(
    templateId: string,
    teamData: {
      name: string;
      description?: string;
      departmentId?: string;
      leaderId?: string;
    },
    memberSelection: {
      autoAssign?: boolean;
      memberIds?: string[];
      skillMatch?: boolean;
    }
  ): Promise<{
    team: Team;
    assignments: Array<{
      employeeId: string;
      role: string;
      skillMatch: number;
    }>;
    unassigned: Array<{
      role: string;
      reason: string;
      suggestions: string[];
    }>;
  }> {
    const response = await apiClient.post<{
      data: {
        team: Team;
        assignments: Array<{
          employeeId: string;
          role: string;
          skillMatch: number;
        }>;
        unassigned: Array<{
          role: string;
          reason: string;
          suggestions: string[];
        }>;
      };
    }>(`/team-templates/${templateId}/create-team`, {
      teamData,
      memberSelection,
    });

    return response.data.data;
  }
}

export default TeamManagementService;
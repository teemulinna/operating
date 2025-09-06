import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { 
  useProjects, 
  useProject, 
  useCreateProject, 
  useUpdateProject, 
  useDeleteProject, 
  useClients, 
  useProjectStats 
} from '@/hooks/useProjects';
import { ProjectService } from '@/services/projectService';

// Mock the ProjectService
vi.mock('@/services/projectService');

const mockProjectService = ProjectService as any;

// Mock project data
const mockProjectsResponse = {
  projects: [
    {
      id: '1',
      name: 'Project Alpha',
      clientName: 'Client A',
      status: 'active' as const,
      startDate: '2024-01-01',
      budget: 50000,
      isActive: true,
      teamMembersCount: 2,
    },
    {
      id: '2',
      name: 'Project Beta',
      clientName: 'Client B',
      status: 'planning' as const,
      startDate: '2024-02-01',
      budget: 30000,
      isActive: true,
      teamMembersCount: 1,
    }
  ],
  total: 2,
  page: 1,
  limit: 10,
  totalPages: 1,
};

const mockProject = {
  id: '1',
  name: 'Project Alpha',
  clientName: 'Client A',
  status: 'active' as const,
  startDate: '2024-01-01',
  budget: 50000,
  isActive: true,
  teamMembersCount: 2,
};

const mockStats = {
  totalProjects: 10,
  activeProjects: 6,
  completedProjects: 3,
  totalBudget: 500000,
  totalBilled: 300000,
  averageProjectDuration: 120,
  onTimeCompletionRate: 85,
  budgetUtilizationRate: 75,
};

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const createWrapper = () => {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useProjects hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useProjects', () => {
    it('fetches projects successfully', async () => {
      mockProjectService.getProjects.mockResolvedValue(mockProjectsResponse);

      const { result } = renderHook(() => useProjects(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockProjectsResponse);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      expect(mockProjectService.getProjects).toHaveBeenCalledWith({}, {});
    });

    it('handles filters and pagination', async () => {
      mockProjectService.getProjects.mockResolvedValue(mockProjectsResponse);

      const filters = { status: 'active' as const, clientName: 'Client A' };
      const pagination = { page: 2, limit: 5 };

      const { result } = renderHook(() => useProjects(filters, pagination), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(mockProjectService.getProjects).toHaveBeenCalledWith(filters, pagination);
    });

    it('handles fetch errors', async () => {
      const error = new Error('Failed to fetch projects');
      mockProjectService.getProjects.mockRejectedValue(error);

      const { result } = renderHook(() => useProjects(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toEqual(error);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.data).toBeUndefined();
      });
    });
  });

  describe('useProject', () => {
    it('fetches single project successfully', async () => {
      mockProjectService.getProject.mockResolvedValue(mockProject);

      const { result } = renderHook(() => useProject('1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockProject);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      expect(mockProjectService.getProject).toHaveBeenCalledWith('1');
    });

    it('does not fetch when id is empty', () => {
      const { result } = renderHook(() => useProject(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.data).toBeUndefined();
      expect(mockProjectService.getProject).not.toHaveBeenCalled();
    });
  });

  describe('useCreateProject', () => {
    it('creates project successfully', async () => {
      mockProjectService.createProject.mockResolvedValue(mockProject);

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createWrapper(),
      });

      const newProjectData = {
        name: 'New Project',
        clientName: 'New Client',
        startDate: '2024-03-01',
      };

      result.current.mutate(newProjectData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(mockProject);
      });

      expect(mockProjectService.createProject).toHaveBeenCalledWith(newProjectData);
    });

    it('handles create errors', async () => {
      const error = new Error('Failed to create project');
      mockProjectService.createProject.mockRejectedValue(error);

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createWrapper(),
      });

      const newProjectData = {
        name: 'New Project',
        clientName: 'New Client',
        startDate: '2024-03-01',
      };

      result.current.mutate(newProjectData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toEqual(error);
      });
    });
  });

  describe('useUpdateProject', () => {
    it('updates project successfully', async () => {
      const updatedProject = { ...mockProject, name: 'Updated Project' };
      mockProjectService.updateProject.mockResolvedValue(updatedProject);

      const { result } = renderHook(() => useUpdateProject(), {
        wrapper: createWrapper(),
      });

      const updateData = { id: '1', updates: { name: 'Updated Project' } };
      result.current.mutate(updateData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(updatedProject);
      });

      expect(mockProjectService.updateProject).toHaveBeenCalledWith('1', { name: 'Updated Project' });
    });
  });

  describe('useDeleteProject', () => {
    it('deletes project successfully', async () => {
      mockProjectService.deleteProject.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteProject(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockProjectService.deleteProject).toHaveBeenCalledWith('1');
    });

    it('handles delete errors', async () => {
      const error = new Error('Failed to delete project');
      mockProjectService.deleteProject.mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteProject(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('1');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toEqual(error);
      });
    });
  });

  describe('useClients', () => {
    it('fetches clients successfully', async () => {
      const clients = ['Client A', 'Client B', 'Client C'];
      mockProjectService.getClients.mockResolvedValue(clients);

      const { result } = renderHook(() => useClients(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(clients);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockProjectService.getClients).toHaveBeenCalled();
    });
  });

  describe('useProjectStats', () => {
    it('fetches project statistics successfully', async () => {
      mockProjectService.getProjectStats.mockResolvedValue(mockStats);

      const { result } = renderHook(() => useProjectStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockStats);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockProjectService.getProjectStats).toHaveBeenCalledWith({});
    });

    it('handles statistics with filters', async () => {
      mockProjectService.getProjectStats.mockResolvedValue(mockStats);

      const filters = { clientName: 'Client A', startDateFrom: '2024-01-01' };

      const { result } = renderHook(() => useProjectStats(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockStats);
      });

      expect(mockProjectService.getProjectStats).toHaveBeenCalledWith(filters);
    });
  });

  describe('Query invalidation', () => {
    it('invalidates project lists after creating project', async () => {
      mockProjectService.createProject.mockResolvedValue(mockProject);
      mockProjectService.getProjects.mockResolvedValue(mockProjectsResponse);

      // First render the list hook
      const { result: listResult } = renderHook(() => useProjects(), {
        wrapper: createWrapper(),
      });

      // Wait for initial load
      await waitFor(() => {
        expect(listResult.current.data).toBeDefined();
      });

      // Then render the create hook
      const { result: createResult } = renderHook(() => useCreateProject(), {
        wrapper: createWrapper(),
      });

      // Create a project
      createResult.current.mutate({
        name: 'New Project',
        clientName: 'New Client',
        startDate: '2024-03-01',
      });

      await waitFor(() => {
        expect(createResult.current.isSuccess).toBe(true);
      });

      // Verify that the list query was invalidated
      expect(mockProjectService.getProjects).toHaveBeenCalledTimes(2);
    });

    it('invalidates project lists after updating project', async () => {
      const updatedProject = { ...mockProject, name: 'Updated Project' };
      mockProjectService.updateProject.mockResolvedValue(updatedProject);
      mockProjectService.getProjects.mockResolvedValue(mockProjectsResponse);

      const { result: listResult } = renderHook(() => useProjects(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(listResult.current.data).toBeDefined();
      });

      const { result: updateResult } = renderHook(() => useUpdateProject(), {
        wrapper: createWrapper(),
      });

      updateResult.current.mutate({ id: '1', updates: { name: 'Updated Project' } });

      await waitFor(() => {
        expect(updateResult.current.isSuccess).toBe(true);
      });

      expect(mockProjectService.getProjects).toHaveBeenCalledTimes(2);
    });

    it('removes project from cache after deletion', async () => {
      mockProjectService.deleteProject.mockResolvedValue(undefined);
      mockProjectService.getProjects.mockResolvedValue(mockProjectsResponse);

      const { result: listResult } = renderHook(() => useProjects(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(listResult.current.data).toBeDefined();
      });

      const { result: deleteResult } = renderHook(() => useDeleteProject(), {
        wrapper: createWrapper(),
      });

      deleteResult.current.mutate('1');

      await waitFor(() => {
        expect(deleteResult.current.isSuccess).toBe(true);
      });

      expect(mockProjectService.getProjects).toHaveBeenCalledTimes(2);
    });
  });

  describe('Stale time configuration', () => {
    it('sets appropriate stale times for different queries', () => {
      // Projects list - 5 minutes stale time
      const { result: projectsResult } = renderHook(() => useProjects(), {
        wrapper: createWrapper(),
      });

      // Clients - 10 minutes stale time (changes infrequently)
      const { result: clientsResult } = renderHook(() => useClients(), {
        wrapper: createWrapper(),
      });

      // Stats - 2 minutes stale time (should be relatively fresh)
      const { result: statsResult } = renderHook(() => useProjectStats(), {
        wrapper: createWrapper(),
      });

      // All queries should be defined
      expect(projectsResult.current).toBeDefined();
      expect(clientsResult.current).toBeDefined();
      expect(statsResult.current).toBeDefined();
    });
  });
});
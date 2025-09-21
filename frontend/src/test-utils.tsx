import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

// Create a test query client with disabled retries
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0, // Disable garbage collection for tests
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  });

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

// Mock data generators
export function createMockProject(overrides = {}) {
  return {
    id: '1',
    name: 'Test Project',
    description: 'Test project description',
    clientName: 'Test Client',
    status: 'active' as const,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    budget: 50000,
    hourlyRate: 100,
    totalHours: 500,
    billedHours: 250,
    isActive: true,
    teamMembers: ['emp1', 'emp2'],
    teamMembersCount: 2,
    tags: ['web', 'frontend'],
    notes: 'Test project notes',
    budgetUtilization: 50,
    timeProgress: 50,
    daysRemaining: 180,
    isOverBudget: false,
    isOverdue: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockTimelineEvent(overrides = {}) {
  return {
    id: '1',
    projectId: '1',
    type: 'created' as const,
    title: 'Project Created',
    description: 'Project was created',
    date: '2024-01-01T00:00:00Z',
    userId: 'user1',
    ...overrides,
  };
}

export function createMockEmployee(overrides = {}) {
  return {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    position: 'Developer',
    departmentId: 'dept1',
    hireDate: '2024-01-01',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// Mock hook return values
export function createMockQueryResult(data = null, options = {}) {
  return {
    data,
    isLoading: false,
    isError: false,
    error: null,
    isFetching: false,
    isSuccess: true,
    refetch: vi.fn(),
    ...options,
  };
}

export function createMockMutationResult(options = {}) {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isLoading: false,
    isError: false,
    error: null,
    isSuccess: false,
    reset: vi.fn(),
    ...options,
  };
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
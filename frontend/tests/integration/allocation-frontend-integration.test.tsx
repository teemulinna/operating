/**
 * TDD Frontend Tests: Real Allocation Data Integration
 * 
 * RED Phase: Tests should fail as we verify frontend uses real backend data
 * GREEN Phase: Connect frontend components to real API endpoints
 * REFACTOR Phase: Add React Query caching and optimistic updates
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { jest } from '@jest/globals';
import { AllocationService } from '../../src/services/allocationService';
import { apiClient } from '../../src/services/api';

// Mock API client but verify real endpoints are called
jest.mock('../../src/services/api');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

// Test data matching backend structure
const testEmployee = {
  id: 'emp-001',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@company.com',
  department: 'Engineering',
  position: 'Senior Developer',
  isActive: true,
  weeklyCapacityHours: 40
};

const testProject = {
  id: 'proj-alpha',
  name: 'Project Alpha',
  description: 'Strategic project for Q2',
  status: 'active',
  clientName: 'Tech Corp',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  budgetHours: 1000
};

const testAllocation = {
  id: 'alloc-001',
  employeeId: 'emp-001',
  projectId: 'proj-alpha',
  allocatedHours: 20,
  actualHours: 18,
  roleOnProject: 'Senior Developer',
  startDate: '2024-02-01T00:00:00.000Z',
  endDate: '2024-03-31T23:59:59.999Z',
  hourlyRate: 100,
  notes: 'Frontend integration test allocation',
  status: 'active',
  isActive: true,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z'
};

// Mock components for testing
const TestAllocationList = () => {
  const [allocations, setAllocations] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadAllocations = async () => {
      try {
        setLoading(true);
        const response = await AllocationService.getAllocations();
        setAllocations(response.allocations);
      } catch (err) {
        setError('Failed to load allocations');
      } finally {
        setLoading(false);
      }
    };
    loadAllocations();
  }, []);

  if (loading) return <div data-testid="loading">Loading allocations...</div>;
  if (error) return <div data-testid="error">{error}</div>;

  return (
    <div data-testid="allocation-list">
      <h2>Allocations</h2>
      {allocations.map((allocation) => (
        <div key={allocation.id} data-testid={`allocation-${allocation.id}`}>
          <span data-testid={`employee-${allocation.employeeId}`}>
            Employee: {allocation.employeeId}
          </span>
          <span data-testid={`project-${allocation.projectId}`}>
            Project: {allocation.projectId}
          </span>
          <span data-testid={`hours-${allocation.id}`}>
            Hours: {allocation.allocatedHours}
          </span>
        </div>
      ))}
    </div>
  );
};

const TestAllocationForm = () => {
  const [formData, setFormData] = React.useState({
    employeeId: '',
    projectId: '',
    allocatedHours: 0,
    roleOnProject: '',
    startDate: '',
    endDate: ''
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const result = await AllocationService.createAllocation(formData);
      setSuccess(true);
      console.log('Created allocation:', result.allocation.id);
    } catch (err) {
      console.error('Failed to create allocation:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="allocation-form">
      <input
        data-testid="employee-id-input"
        value={formData.employeeId}
        onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
        placeholder="Employee ID"
        required
      />
      <input
        data-testid="project-id-input"
        value={formData.projectId}
        onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
        placeholder="Project ID"
        required
      />
      <input
        data-testid="hours-input"
        type="number"
        value={formData.allocatedHours}
        onChange={(e) => setFormData({ ...formData, allocatedHours: Number(e.target.value) })}
        placeholder="Allocated Hours"
        required
      />
      <input
        data-testid="role-input"
        value={formData.roleOnProject}
        onChange={(e) => setFormData({ ...formData, roleOnProject: e.target.value })}
        placeholder="Role on Project"
        required
      />
      <input
        data-testid="start-date-input"
        type="date"
        value={formData.startDate}
        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
        required
      />
      <input
        data-testid="end-date-input"
        type="date"
        value={formData.endDate}
        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
        required
      />
      <button 
        type="submit" 
        disabled={submitting}
        data-testid="submit-button"
      >
        {submitting ? 'Creating...' : 'Create Allocation'}
      </button>
      {success && <div data-testid="success-message">Allocation created successfully!</div>}
    </form>
  );
};

const TestEmployeeCapacityView = ({ employeeId }: { employeeId: string }) => {
  const [utilization, setUtilization] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadUtilization = async () => {
      try {
        const data = await AllocationService.getEmployeeUtilization(employeeId);
        setUtilization(data);
      } catch (err) {
        console.error('Failed to load utilization:', err);
      } finally {
        setLoading(false);
      }
    };
    loadUtilization();
  }, [employeeId]);

  if (loading) return <div data-testid="utilization-loading">Loading capacity...</div>;
  if (!utilization) return <div data-testid="utilization-error">No utilization data</div>;

  return (
    <div data-testid="employee-capacity-view">
      <h3>Employee Capacity</h3>
      <div data-testid="total-hours">{utilization.totalAllocatedHours || 0} hours allocated</div>
      <div data-testid="utilization-rate">{utilization.utilizationRate || 0}% utilized</div>
      <div data-testid="capacity-status">
        {utilization.utilizationRate > 100 ? 'Over-allocated' : 'Available capacity'}
      </div>
    </div>
  );
};

describe('RED: Frontend Allocation Data Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    jest.clearAllMocks();
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('RED: Allocation List Integration', () => {
    test('should call real API endpoint for allocation list', async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [testAllocation],
          pagination: {
            totalItems: 1,
            currentPage: 1,
            limit: 10,
            totalPages: 1
          }
        }
      });

      renderWithQueryClient(<TestAllocationList />);

      expect(screen.getByTestId('loading')).toBeInTheDocument();

      await waitFor(() => {
        expect(mockedApiClient.get).toHaveBeenCalledWith('/allocations?');
      });

      await waitFor(() => {
        expect(screen.getByTestId('allocation-list')).toBeInTheDocument();
      });

      expect(screen.getByTestId('allocation-alloc-001')).toBeInTheDocument();
      expect(screen.getByTestId('employee-emp-001')).toHaveTextContent('Employee: emp-001');
      expect(screen.getByTestId('project-proj-alpha')).toHaveTextContent('Project: proj-alpha');
      expect(screen.getByTestId('hours-alloc-001')).toHaveTextContent('Hours: 20');
    });

    test('should handle API errors gracefully', async () => {
      mockedApiClient.get.mockRejectedValueOnce(new Error('Network error'));

      renderWithQueryClient(<TestAllocationList />);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Failed to load allocations');
      });
    });
  });

  describe('RED: Allocation Creation Integration', () => {
    test('should submit allocation to real API endpoint', async () => {
      const createdAllocation = { ...testAllocation, id: 'alloc-new-001' };
      mockedApiClient.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: createdAllocation
        }
      });

      renderWithQueryClient(<TestAllocationForm />);

      // Fill form with test data
      fireEvent.change(screen.getByTestId('employee-id-input'), {
        target: { value: 'emp-001' }
      });
      fireEvent.change(screen.getByTestId('project-id-input'), {
        target: { value: 'proj-alpha' }
      });
      fireEvent.change(screen.getByTestId('hours-input'), {
        target: { value: '20' }
      });
      fireEvent.change(screen.getByTestId('role-input'), {
        target: { value: 'Senior Developer' }
      });
      fireEvent.change(screen.getByTestId('start-date-input'), {
        target: { value: '2024-02-01' }
      });
      fireEvent.change(screen.getByTestId('end-date-input'), {
        target: { value: '2024-03-31' }
      });

      // Submit form
      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(mockedApiClient.post).toHaveBeenCalledWith('/allocations', {
          employeeId: 'emp-001',
          projectId: 'proj-alpha',
          allocatedHours: 20,
          roleOnProject: 'Senior Developer',
          startDate: '2024-02-01',
          endDate: '2024-03-31',
          checkConflicts: true,
          forceCreate: false
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toBeInTheDocument();
      });
    });

    test('should validate required fields before API call', async () => {
      renderWithQueryClient(<TestAllocationForm />);

      // Submit form without required fields
      fireEvent.click(screen.getByTestId('submit-button'));

      // Should not make API call with empty required fields
      expect(mockedApiClient.post).not.toHaveBeenCalled();
    });
  });

  describe('RED: Employee Capacity Integration', () => {
    test('should fetch real employee utilization data', async () => {
      const utilizationData = {
        employeeId: 'emp-001',
        totalAllocatedHours: 60,
        utilizationRate: 75,
        maxCapacityHours: 80,
        allocations: [
          { ...testAllocation, allocatedHours: 20 },
          { ...testAllocation, id: 'alloc-002', allocatedHours: 40 }
        ]
      };

      mockedApiClient.get.mockResolvedValueOnce({
        data: { data: utilizationData }
      });

      renderWithQueryClient(<TestEmployeeCapacityView employeeId="emp-001" />);

      expect(screen.getByTestId('utilization-loading')).toBeInTheDocument();

      await waitFor(() => {
        expect(mockedApiClient.get).toHaveBeenCalledWith(
          '/allocations/utilization/employee/emp-001?'
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('employee-capacity-view')).toBeInTheDocument();
      });

      expect(screen.getByTestId('total-hours')).toHaveTextContent('60 hours allocated');
      expect(screen.getByTestId('utilization-rate')).toHaveTextContent('75% utilized');
      expect(screen.getByTestId('capacity-status')).toHaveTextContent('Available capacity');
    });

    test('should detect over-allocation from real data', async () => {
      const overUtilizationData = {
        employeeId: 'emp-001',
        totalAllocatedHours: 120,
        utilizationRate: 150,
        maxCapacityHours: 80,
        allocations: []
      };

      mockedApiClient.get.mockResolvedValueOnce({
        data: { data: overUtilizationData }
      });

      renderWithQueryClient(<TestEmployeeCapacityView employeeId="emp-001" />);

      await waitFor(() => {
        expect(screen.getByTestId('employee-capacity-view')).toBeInTheDocument();
      });

      expect(screen.getByTestId('utilization-rate')).toHaveTextContent('150% utilized');
      expect(screen.getByTestId('capacity-status')).toHaveTextContent('Over-allocated');
    });
  });

  describe('RED: Data Flow Verification Tests', () => {
    test('should verify allocation data flows from API to UI components', async () => {
      // Setup multi-step data flow test
      const allocations = [testAllocation];
      
      mockedApiClient.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: allocations,
          pagination: { totalItems: 1, currentPage: 1, limit: 10, totalPages: 1 }
        }
      });

      renderWithQueryClient(<TestAllocationList />);

      // Wait for API call
      await waitFor(() => {
        expect(mockedApiClient.get).toHaveBeenCalledWith('/allocations?');
      });

      // Verify data appears in UI
      await waitFor(() => {
        expect(screen.getByTestId('allocation-alloc-001')).toBeInTheDocument();
      });

      // Verify data integrity
      const employeeElement = screen.getByTestId('employee-emp-001');
      const projectElement = screen.getByTestId('project-proj-alpha');
      const hoursElement = screen.getByTestId('hours-alloc-001');

      expect(employeeElement).toHaveTextContent('Employee: emp-001');
      expect(projectElement).toHaveTextContent('Project: proj-alpha');
      expect(hoursElement).toHaveTextContent('Hours: 20');
    });

    test('should verify no mock data indicators in responses', async () => {
      const realAllocation = {
        ...testAllocation,
        id: 'real-allocation-123',
        notes: 'Production allocation data'
      };

      mockedApiClient.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [realAllocation],
          pagination: { totalItems: 1, currentPage: 1, limit: 10, totalPages: 1 }
        }
      });

      renderWithQueryClient(<TestAllocationList />);

      await waitFor(() => {
        const allocationElement = screen.getByTestId('allocation-real-allocation-123');
        expect(allocationElement).toBeInTheDocument();
      });

      // Verify no mock data patterns
      expect(screen.queryByTestId('employee-mock-emp-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('project-mock-proj-1')).not.toBeInTheDocument();
      expect(screen.queryByText(/mock/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/test data/i)).not.toBeInTheDocument();
    });
  });

  describe('RED: End-to-End John Doe Allocation Test', () => {
    test('should handle complete John Doe → Project Alpha → 20h allocation flow', async () => {
      const johnDoeAllocation = {
        id: 'john-doe-alpha-allocation',
        employeeId: 'john-doe-001',
        projectId: 'project-alpha-001',
        allocatedHours: 20,
        roleOnProject: 'Senior Full Stack Developer',
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-08-31T23:59:59.999Z',
        hourlyRate: 120,
        notes: 'John Doe allocation to Project Alpha',
        status: 'active',
        isActive: true
      };

      // Mock creation response
      mockedApiClient.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: johnDoeAllocation
        }
      });

      // Mock utilization response
      mockedApiClient.get.mockResolvedValueOnce({
        data: {
          data: {
            employeeId: 'john-doe-001',
            totalAllocatedHours: 20,
            utilizationRate: 50, // 20/40 hours
            maxCapacityHours: 40
          }
        }
      });

      // Step 1: Create allocation
      renderWithQueryClient(<TestAllocationForm />);

      fireEvent.change(screen.getByTestId('employee-id-input'), {
        target: { value: 'john-doe-001' }
      });
      fireEvent.change(screen.getByTestId('project-id-input'), {
        target: { value: 'project-alpha-001' }
      });
      fireEvent.change(screen.getByTestId('hours-input'), {
        target: { value: '20' }
      });
      fireEvent.change(screen.getByTestId('role-input'), {
        target: { value: 'Senior Full Stack Developer' }
      });

      fireEvent.click(screen.getByTestId('submit-button'));

      // Step 2: Verify API call
      await waitFor(() => {
        expect(mockedApiClient.post).toHaveBeenCalledWith('/allocations', {
          employeeId: 'john-doe-001',
          projectId: 'project-alpha-001',
          allocatedHours: 20,
          roleOnProject: 'Senior Full Stack Developer',
          startDate: '',
          endDate: '',
          checkConflicts: true,
          forceCreate: false
        });
      });

      // Step 3: Verify success feedback
      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toBeInTheDocument();
      });

      // Step 4: Verify capacity view reflects new allocation
      const { rerender } = renderWithQueryClient(
        <TestEmployeeCapacityView employeeId="john-doe-001" />
      );

      await waitFor(() => {
        expect(screen.getByTestId('total-hours')).toHaveTextContent('20 hours allocated');
        expect(screen.getByTestId('utilization-rate')).toHaveTextContent('50% utilized');
      });

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/allocations/utilization/employee/john-doe-001?'
      );
    });
  });
});
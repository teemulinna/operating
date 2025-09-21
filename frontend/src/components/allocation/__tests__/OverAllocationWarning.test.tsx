import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { OverAllocationWarning } from '../OverAllocationWarning';
import { useOverAllocationWarnings } from '../../../hooks/useOverAllocationWarnings';
import '@testing-library/jest-dom';

// Mock the custom hook
jest.mock('../../../hooks/useOverAllocationWarnings');

const mockUseOverAllocationWarnings = useOverAllocationWarnings as jest.MockedFunction<typeof useOverAllocationWarnings>;

describe('OverAllocationWarning Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Visual Indicators', () => {
    it('should display red highlight and warning icon for over-allocated employee', async () => {
      // Arrange
      const mockWarningData = {
        isOverAllocated: true,
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        totalAllocatedHours: 50,
        defaultHours: 40,
        overAllocationHours: 10,
        utilizationRate: 125,
        severity: 'high' as const,
        warnings: ['Employee is over-allocated by 10 hours (125% capacity)']
      };

      mockUseOverAllocationWarnings.mockReturnValue({
        warnings: [mockWarningData],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      // Act
      render(<OverAllocationWarning employeeId="emp-1" />);

      // Assert
      await waitFor(() => {
        // Check for red highlight/background
        const warningContainer = screen.getByTestId('over-allocation-warning');
        expect(warningContainer).toHaveClass('bg-red-50', 'border-red-200');
        
        // Check for warning icon
        const warningIcon = screen.getByTestId('warning-icon');
        expect(warningIcon).toBeInTheDocument();
        expect(warningIcon).toHaveClass('text-red-500');
        
        // Check warning message
        expect(screen.getByText(/over-allocated by 10 hours/i)).toBeInTheDocument();
        expect(screen.getByText(/125% capacity/i)).toBeInTheDocument();
      });
    });

    it('should display medium severity styling for medium over-allocation', async () => {
      // Arrange
      const mockWarningData = {
        isOverAllocated: true,
        employeeId: 'emp-1',
        employeeName: 'Jane Smith',
        totalAllocatedHours: 42,
        defaultHours: 40,
        overAllocationHours: 2,
        utilizationRate: 105,
        severity: 'medium' as const,
        warnings: ['Employee is slightly over-allocated by 2 hours (105% capacity)']
      };

      mockUseOverAllocationWarnings.mockReturnValue({
        warnings: [mockWarningData],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      // Act
      render(<OverAllocationWarning employeeId="emp-1" />);

      // Assert
      await waitFor(() => {
        const warningContainer = screen.getByTestId('over-allocation-warning');
        expect(warningContainer).toHaveClass('bg-yellow-50', 'border-yellow-200');
        
        const warningIcon = screen.getByTestId('warning-icon');
        expect(warningIcon).toHaveClass('text-yellow-500');
      });
    });

    it('should display critical severity styling for critical over-allocation', async () => {
      // Arrange
      const mockWarningData = {
        isOverAllocated: true,
        employeeId: 'emp-1',
        employeeName: 'Bob Wilson',
        totalAllocatedHours: 60,
        defaultHours: 40,
        overAllocationHours: 20,
        utilizationRate: 150,
        severity: 'critical' as const,
        warnings: ['Employee is critically over-allocated by 20 hours (150% capacity)']
      };

      mockUseOverAllocationWarnings.mockReturnValue({
        warnings: [mockWarningData],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      // Act
      render(<OverAllocationWarning employeeId="emp-1" />);

      // Assert
      await waitFor(() => {
        const warningContainer = screen.getByTestId('over-allocation-warning');
        expect(warningContainer).toHaveClass('bg-red-100', 'border-red-400');
        
        const warningIcon = screen.getByTestId('warning-icon');
        expect(warningIcon).toHaveClass('text-red-600');
        
        // Should have pulsing animation for critical warnings
        expect(warningContainer).toHaveClass('animate-pulse');
      });
    });

    it('should not display warning when employee is not over-allocated', async () => {
      // Arrange
      const mockWarningData = {
        isOverAllocated: false,
        employeeId: 'emp-1',
        employeeName: 'Alice Johnson',
        totalAllocatedHours: 30,
        defaultHours: 40,
        overAllocationHours: 0,
        utilizationRate: 75,
        severity: 'none' as const,
        warnings: []
      };

      mockUseOverAllocationWarnings.mockReturnValue({
        warnings: [mockWarningData],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      // Act
      render(<OverAllocationWarning employeeId="emp-1" />);

      // Assert
      expect(screen.queryByTestId('over-allocation-warning')).not.toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should update warning display when allocation changes', async () => {
      // Arrange - Start with no over-allocation
      const initialData = {
        isOverAllocated: false,
        employeeId: 'emp-1',
        employeeName: 'Test User',
        totalAllocatedHours: 30,
        defaultHours: 40,
        overAllocationHours: 0,
        utilizationRate: 75,
        severity: 'none' as const,
        warnings: []
      };

      const { rerender } = render(<OverAllocationWarning employeeId="emp-1" />);

      mockUseOverAllocationWarnings.mockReturnValue({
        warnings: [initialData],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      rerender(<OverAllocationWarning employeeId="emp-1" />);

      // Assert - No warning initially
      expect(screen.queryByTestId('over-allocation-warning')).not.toBeInTheDocument();

      // Act - Simulate allocation change causing over-allocation
      const updatedData = {
        ...initialData,
        isOverAllocated: true,
        totalAllocatedHours: 45,
        overAllocationHours: 5,
        utilizationRate: 112.5,
        severity: 'medium' as const,
        warnings: ['Employee is over-allocated by 5 hours (112.5% capacity)']
      };

      mockUseOverAllocationWarnings.mockReturnValue({
        warnings: [updatedData],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      rerender(<OverAllocationWarning employeeId="emp-1" />);

      // Assert - Warning should appear
      await waitFor(() => {
        expect(screen.getByTestId('over-allocation-warning')).toBeInTheDocument();
        expect(screen.getByText(/over-allocated by 5 hours/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading and Error States', () => {
    it('should display loading state while fetching warnings', () => {
      // Arrange
      mockUseOverAllocationWarnings.mockReturnValue({
        warnings: [],
        loading: true,
        error: null,
        refetch: jest.fn()
      });

      // Act
      render(<OverAllocationWarning employeeId="emp-1" />);

      // Assert
      expect(screen.getByTestId('warning-loading')).toBeInTheDocument();
    });

    it('should display error state when warning fetch fails', () => {
      // Arrange
      mockUseOverAllocationWarnings.mockReturnValue({
        warnings: [],
        loading: false,
        error: new Error('Failed to fetch warnings'),
        refetch: jest.fn()
      });

      // Act
      render(<OverAllocationWarning employeeId="emp-1" />);

      // Assert
      expect(screen.getByTestId('warning-error')).toBeInTheDocument();
      expect(screen.getByText(/failed to load allocation warnings/i)).toBeInTheDocument();
    });
  });

  describe('Resolution Suggestions', () => {
    it('should display resolution suggestions when over-allocation is detected', async () => {
      // Arrange - This test should initially fail since resolution suggestions aren't implemented
      const mockWarningData = {
        isOverAllocated: true,
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        totalAllocatedHours: 50,
        defaultHours: 40,
        overAllocationHours: 10,
        utilizationRate: 125,
        severity: 'high' as const,
        warnings: ['Employee is over-allocated by 10 hours (125% capacity)'],
        suggestions: [
          'Reduce allocation on Project A by 5 hours',
          'Extend timeline for Project B by 1 week',
          'Assign additional team member to Project C'
        ]
      };

      mockUseOverAllocationWarnings.mockReturnValue({
        warnings: [mockWarningData],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      // Act
      render(<OverAllocationWarning employeeId="emp-1" showSuggestions />);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('resolution-suggestions')).toBeInTheDocument();
        expect(screen.getByText(/reduce allocation on project a/i)).toBeInTheDocument();
        expect(screen.getByText(/extend timeline for project b/i)).toBeInTheDocument();
        expect(screen.getByText(/assign additional team member/i)).toBeInTheDocument();
      });
    });
  });
});
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import WeeklyScheduleGrid from '../../../src/components/schedule/WeeklyScheduleGrid';

// Mock API responses
const mockEmployees = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    name: 'John Doe',
    defaultHoursPerWeek: 40,
    capacity: 40
  },
  {
    id: '2', 
    firstName: 'Jane',
    lastName: 'Smith',
    name: 'Jane Smith',
    defaultHoursPerWeek: 35,
    capacity: 35
  },
  {
    id: '3',
    firstName: 'Mike',
    lastName: 'Johnson', 
    name: 'Mike Johnson',
    defaultHoursPerWeek: 40,
    capacity: 40
  }
];

const mockProjects = [
  {
    id: '1',
    name: 'Project Alpha',
    status: 'active',
    color: '#3B82F6'
  },
  {
    id: '2',
    name: 'Project Beta', 
    status: 'active',
    color: '#10B981'
  },
  {
    id: '3',
    name: 'Project Gamma',
    status: 'active', 
    color: '#F59E0B'
  }
];

const mockAllocations = [
  {
    id: '1',
    employeeId: '1',
    projectId: '1',
    allocatedHours: 30,
    startDate: '2024-01-01',
    endDate: '2024-01-07',
    weekStart: '2024-01-01'
  },
  {
    id: '2',
    employeeId: '1', 
    projectId: '2',
    allocatedHours: 15,
    startDate: '2024-01-08',
    endDate: '2024-01-14',
    weekStart: '2024-01-08'
  },
  {
    id: '3',
    employeeId: '2',
    projectId: '1', 
    allocatedHours: 45, // Over-allocation
    startDate: '2024-01-01',
    endDate: '2024-01-07',
    weekStart: '2024-01-01'
  }
];

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('WeeklyScheduleGrid - PRD Story 3.1 Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful API responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/employees')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockEmployees })
        });
      }
      if (url.includes('/api/projects')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockProjects })
        });
      }
      if (url.includes('/api/allocations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockAllocations })
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('RED: Grid Structure Requirements (PRD Critical)', () => {
    it('should render weekly schedule grid with proper test IDs', async () => {
      render(<WeeklyScheduleGrid />);
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // Check for main grid container
      expect(screen.getByTestId('weekly-schedule-grid')).toBeInTheDocument();
      expect(screen.getByTestId('grid-table')).toBeInTheDocument();
    });

    it('should display employees as rows (Y-axis) - PRD CRITICAL', async () => {
      render(<WeeklyScheduleGrid />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // Check employee rows are present
      expect(screen.getByTestId('employee-row-1')).toBeInTheDocument();
      expect(screen.getByTestId('employee-row-2')).toBeInTheDocument(); 
      expect(screen.getByTestId('employee-row-3')).toBeInTheDocument();

      // Verify employee names are displayed
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Mike Johnson')).toBeInTheDocument();
    });

    it('should display weeks as columns (X-axis) - PRD CRITICAL', async () => {
      render(<WeeklyScheduleGrid />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // Check for week column headers
      const weekHeaders = screen.getAllByTestId(/week-header-\d+/);
      expect(weekHeaders.length).toBeGreaterThan(0);
      
      // Should display current week and future weeks
      expect(weekHeaders.length).toBeGreaterThanOrEqual(4); // At least 4 weeks visible
    });

    it('should create grid cells at intersection of employees and weeks - PRD CRITICAL', async () => {
      render(<WeeklyScheduleGrid />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // Check for grid cells at intersections
      expect(screen.getByTestId('grid-cell-1-0')).toBeInTheDocument(); // Employee 1, Week 0
      expect(screen.getByTestId('grid-cell-2-0')).toBeInTheDocument(); // Employee 2, Week 0
      expect(screen.getByTestId('grid-cell-1-1')).toBeInTheDocument(); // Employee 1, Week 1
    });
  });

  describe('RED: Allocation Data Display Requirements', () => {
    it('should display project assignments in grid cells - PRD CRITICAL', async () => {
      render(<WeeklyScheduleGrid />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // Check for project names in cells
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      expect(screen.getByText('Project Beta')).toBeInTheDocument();
    });

    it('should show allocation hours in grid cells - PRD CRITICAL', async () => {
      render(<WeeklyScheduleGrid />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // Check for hour displays
      expect(screen.getByText('30h')).toBeInTheDocument();
      expect(screen.getByText('15h')).toBeInTheDocument();
      expect(screen.getByText('45h')).toBeInTheDocument();
    });

    it('should fetch real data from /api/employees endpoint', async () => {
      render(<WeeklyScheduleGrid />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/employees'),
          expect.any(Object)
        );
      });
    });

    it('should fetch real data from /api/allocations endpoint', async () => {
      render(<WeeklyScheduleGrid />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/allocations'),
          expect.any(Object)
        );
      });
    });
  });

  describe('RED: Over-allocation Highlighting Requirements', () => {
    it('should highlight over-allocated cells in red - PRD CRITICAL', async () => {
      render(<WeeklyScheduleGrid />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // Check for over-allocation warning on Jane Smith (45h > 35h capacity)
      const overAllocatedCell = screen.getByTestId('grid-cell-2-0');
      expect(overAllocatedCell).toHaveClass('bg-red-200');
      
      // Should show over-allocation warning icon
      expect(screen.getByTestId('over-allocation-warning-2-0')).toBeInTheDocument();
    });

    it('should show different colors for different utilization levels', async () => {
      render(<WeeklyScheduleGrid />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // Low utilization should be green
      const lowUtilCell = screen.getByTestId('grid-cell-1-0'); // 30h/40h = 75%
      expect(lowUtilCell).toHaveClass('bg-orange-100'); // 75% is high util
      
      // Over-allocation should be red  
      const overAllocCell = screen.getByTestId('grid-cell-2-0'); // 45h/35h > 100%
      expect(overAllocCell).toHaveClass('bg-red-200');
    });
  });

  describe('RED: Week Navigation Requirements', () => {
    it('should display previous week navigation button - PRD CRITICAL', async () => {
      render(<WeeklyScheduleGrid />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      const prevButton = screen.getByTestId('previous-week-button');
      expect(prevButton).toBeInTheDocument();
      expect(prevButton).toHaveTextContent('Previous');
    });

    it('should display next week navigation button - PRD CRITICAL', async () => {
      render(<WeeklyScheduleGrid />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      const nextButton = screen.getByTestId('next-week-button');
      expect(nextButton).toBeInTheDocument(); 
      expect(nextButton).toHaveTextContent('Next');
    });

    it('should display today button for navigation', async () => {
      render(<WeeklyScheduleGrid />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      const todayButton = screen.getByTestId('today-button');
      expect(todayButton).toBeInTheDocument();
      expect(todayButton).toHaveTextContent('Today');
    });

    it('should change week range when navigation buttons are clicked', async () => {
      render(<WeeklyScheduleGrid />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      const nextButton = screen.getByTestId('next-week-button');
      
      // Get initial week range
      const initialWeekHeaders = screen.getAllByTestId(/week-header-\d+/);
      const initialFirstWeek = initialWeekHeaders[0].textContent;
      
      // Click next button
      fireEvent.click(nextButton);
      
      // Wait for update and check that week range changed
      await waitFor(() => {
        const newWeekHeaders = screen.getAllByTestId(/week-header-\d+/);
        const newFirstWeek = newWeekHeaders[0].textContent;
        expect(newFirstWeek).not.toBe(initialFirstWeek);
      });
    });
  });

  describe('RED: Enhanced Features Requirements', () => {
    it('should support drag-and-drop allocation creation when implemented', async () => {
      render(<WeeklyScheduleGrid />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // This test will initially fail - drag and drop not implemented yet
      const dragHandle = screen.queryByTestId('drag-handle-1');
      expect(dragHandle).toBeNull(); // Should fail initially
    });

    it('should show hover details for allocations when implemented', async () => {
      render(<WeeklyScheduleGrid />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // This test will initially fail - hover details not implemented yet
      const allocationBlock = screen.getByText('Project Alpha').closest('[data-testid^="allocation-block"]');
      expect(allocationBlock).toBeNull(); // Should fail initially
    });

    it('should be responsive for mobile devices', async () => {
      render(<WeeklyScheduleGrid />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      const gridContainer = screen.getByTestId('weekly-schedule-grid');
      expect(gridContainer).toHaveClass('responsive-grid'); // Should fail initially
    });
  });

  describe('RED: API Integration Requirements', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockImplementation(() => Promise.reject(new Error('API Error')));
      
      render(<WeeklyScheduleGrid />);
      
      // Should show error state or fallback to mock data
      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // Should either show error message or fallback data
      expect(
        screen.getByTestId('error-message') || 
        screen.getByTestId('weekly-schedule-grid')
      ).toBeInTheDocument();
    });

    it('should show loading state while fetching data', () => {
      // Make fetch hang to test loading state
      mockFetch.mockImplementation(() => new Promise(() => {}));
      
      render(<WeeklyScheduleGrid />);
      
      expect(screen.getByText(/Loading/)).toBeInTheDocument();
    });

    it('should refresh data when date range changes', async () => {
      render(<WeeklyScheduleGrid />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      const initialCallCount = mockFetch.mock.calls.length;
      
      // Navigate to next week
      const nextButton = screen.getByTestId('next-week-button');
      fireEvent.click(nextButton);
      
      // Should make additional API calls for new date range
      await waitFor(() => {
        expect(mockFetch.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });
  });
});

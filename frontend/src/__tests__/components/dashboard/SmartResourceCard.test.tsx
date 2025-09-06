import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SmartResourceCard } from '../../../components/dashboard/SmartResourceCard';
import { Employee, CapacityData } from '../../../hooks/useResourceData';

import { vi } from 'vitest';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockEmployee: Employee = {
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@company.com',
  departmentId: 1,
  position: 'Senior Developer',
  skills: ['React', 'TypeScript', 'Node.js'],
  salary: 85000,
  isActive: true
};

const mockCapacityData: CapacityData[] = [
  {
    id: '1-2025-01-01',
    employeeId: '1',
    date: '2025-01-01T00:00:00.000Z',
    availableHours: 40,
    allocatedHours: 32,
    utilizationRate: 0.8
  },
  {
    id: '1-2025-01-02',
    employeeId: '1',
    date: '2025-01-02T00:00:00.000Z',
    availableHours: 40,
    allocatedHours: 38,
    utilizationRate: 0.95
  }
];

describe('SmartResourceCard', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    // Mock successful API responses
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] })
    });
  });

  describe('Employee Information Display', () => {
    it('renders employee basic information correctly', () => {
      render(<SmartResourceCard employee={mockEmployee} capacityData={mockCapacityData} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Senior Developer')).toBeInTheDocument();
      expect(screen.getByText('john.doe@company.com')).toBeInTheDocument();
    });

    it('displays employee skills as badges', () => {
      render(<SmartResourceCard employee={mockEmployee} capacityData={mockCapacityData} />);
      
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
      expect(screen.getByText('Node.js')).toBeInTheDocument();
    });

    it('handles missing employee data gracefully', () => {
      const incompleteEmployee = { ...mockEmployee, skills: [] };
      render(<SmartResourceCard employee={incompleteEmployee} capacityData={[]} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('React')).not.toBeInTheDocument();
    });
  });

  describe('Progress Ring Display', () => {
    it('renders utilization progress ring with correct percentage', () => {
      render(<SmartResourceCard employee={mockEmployee} capacityData={mockCapacityData} />);
      
      // Should calculate average utilization: (0.8 + 0.95) / 2 = 0.875 = 87.5%
      expect(screen.getByText('88%')).toBeInTheDocument();
      expect(screen.getByText('Utilization')).toBeInTheDocument();
    });

    it('shows 0% when no capacity data is available', () => {
      render(<SmartResourceCard employee={mockEmployee} capacityData={[]} />);
      
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('handles over-utilization correctly', () => {
      const overUtilizedData: CapacityData[] = [{
        id: '1-2025-01-01',
        employeeId: '1',
        date: '2025-01-01T00:00:00.000Z',
        availableHours: 40,
        allocatedHours: 48,
        utilizationRate: 1.2
      }];

      render(<SmartResourceCard employee={mockEmployee} capacityData={overUtilizedData} />);
      
      expect(screen.getByText('120%')).toBeInTheDocument();
      // Should show warning indicator for over-utilization
      expect(screen.getByTestId('over-utilization-warning')).toBeInTheDocument();
    });

    it('applies correct color coding for utilization levels', () => {
      const { rerender } = render(
        <SmartResourceCard employee={mockEmployee} capacityData={[{
          ...mockCapacityData[0],
          utilizationRate: 0.5
        }]} />
      );
      
      // Low utilization - should be green
      expect(screen.getByTestId('progress-ring')).toHaveClass('text-green-500');

      rerender(
        <SmartResourceCard employee={mockEmployee} capacityData={[{
          ...mockCapacityData[0],
          utilizationRate: 0.85
        }]} />
      );
      
      // High utilization - should be yellow/amber
      expect(screen.getByTestId('progress-ring')).toHaveClass('text-amber-500');

      rerender(
        <SmartResourceCard employee={mockEmployee} capacityData={[{
          ...mockCapacityData[0],
          utilizationRate: 1.1
        }]} />
      );
      
      // Over-utilization - should be red
      expect(screen.getByTestId('progress-ring')).toHaveClass('text-red-500');
    });
  });

  describe('Quick Actions', () => {
    it('renders all quick action buttons', () => {
      render(<SmartResourceCard employee={mockEmployee} capacityData={mockCapacityData} />);
      
      expect(screen.getByRole('button', { name: /Schedule/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Quick Assign/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Analytics/ })).toBeInTheDocument();
    });

    it('calls schedule callback when Schedule button is clicked', () => {
      const onSchedule = jest.fn();
      render(
        <SmartResourceCard 
          employee={mockEmployee} 
          capacityData={mockCapacityData}
          onSchedule={onSchedule}
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /Schedule/ }));
      expect(onSchedule).toHaveBeenCalledWith(mockEmployee);
    });

    it('calls assign callback when Quick Assign button is clicked', () => {
      const onAssign = jest.fn();
      render(
        <SmartResourceCard 
          employee={mockEmployee} 
          capacityData={mockCapacityData}
          onAssign={onAssign}
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /Quick Assign/ }));
      expect(onAssign).toHaveBeenCalledWith(mockEmployee);
    });

    it('calls analytics callback when Analytics button is clicked', () => {
      const onAnalytics = jest.fn();
      render(
        <SmartResourceCard 
          employee={mockEmployee} 
          capacityData={mockCapacityData}
          onAnalytics={onAnalytics}
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /Analytics/ }));
      expect(onAnalytics).toHaveBeenCalledWith(mockEmployee);
    });

    it('disables action buttons when employee is inactive', () => {
      const inactiveEmployee = { ...mockEmployee, isActive: false };
      render(<SmartResourceCard employee={inactiveEmployee} capacityData={mockCapacityData} />);
      
      expect(screen.getByRole('button', { name: /Schedule/ })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Quick Assign/ })).toBeDisabled();
    });
  });

  describe('Mini Calendar', () => {
    it('displays calendar with current month', () => {
      render(<SmartResourceCard employee={mockEmployee} capacityData={mockCapacityData} />);
      
      const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      expect(screen.getByText(currentMonth)).toBeInTheDocument();
    });

    it('shows allocation indicators on calendar dates', async () => {
      render(<SmartResourceCard employee={mockEmployee} capacityData={mockCapacityData} />);
      
      // Should show indicators for dates with allocations
      await waitFor(() => {
        const calendarCells = screen.getAllByTestId(/^calendar-day-/);
        expect(calendarCells.length).toBeGreaterThan(0);
      });
    });

    it('allows navigation between months', () => {
      render(<SmartResourceCard employee={mockEmployee} capacityData={mockCapacityData} />);
      
      const nextMonthButton = screen.getByTestId('next-month-button');
      const prevMonthButton = screen.getByTestId('prev-month-button');
      
      expect(nextMonthButton).toBeInTheDocument();
      expect(prevMonthButton).toBeInTheDocument();
      
      fireEvent.click(nextMonthButton);
      // Should navigate to next month
    });

    it('shows tooltip with allocation details on date hover', async () => {
      render(<SmartResourceCard employee={mockEmployee} capacityData={mockCapacityData} />);
      
      const dateCell = screen.getByTestId('calendar-day-1');
      fireEvent.mouseEnter(dateCell);
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
        expect(screen.getByText(/32\/40 hours/)).toBeInTheDocument();
      });
    });
  });

  describe('Micro-interactions', () => {
    it('applies hover animations to the card', () => {
      render(<SmartResourceCard employee={mockEmployee} capacityData={mockCapacityData} />);
      
      const card = screen.getByTestId('smart-resource-card');
      expect(card).toHaveAttribute('whileHover', expect.stringContaining('scale'));
    });

    it('shows loading state during data updates', () => {
      render(
        <SmartResourceCard 
          employee={mockEmployee} 
          capacityData={mockCapacityData}
          isLoading={true}
        />
      );
      
      expect(screen.getByTestId('card-loading-spinner')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Schedule/ })).toBeDisabled();
    });

    it('animates utilization ring changes', () => {
      const { rerender } = render(
        <SmartResourceCard employee={mockEmployee} capacityData={[mockCapacityData[0]]} />
      );
      
      // Change utilization data
      rerender(
        <SmartResourceCard employee={mockEmployee} capacityData={[mockCapacityData[1]]} />
      );
      
      // Should animate the progress ring transition
      expect(screen.getByTestId('progress-ring')).toHaveAttribute('animate', expect.anything());
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels for interactive elements', () => {
      render(<SmartResourceCard employee={mockEmployee} capacityData={mockCapacityData} />);
      
      expect(screen.getByRole('button', { name: /Schedule John Doe/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Quick assign John Doe/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /View analytics for John Doe/ })).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(<SmartResourceCard employee={mockEmployee} capacityData={mockCapacityData} />);
      
      const scheduleButton = screen.getByRole('button', { name: /Schedule/ });
      scheduleButton.focus();
      expect(scheduleButton).toHaveFocus();
      
      // Tab to next button
      fireEvent.keyDown(scheduleButton, { key: 'Tab' });
      expect(screen.getByRole('button', { name: /Quick Assign/ })).toHaveFocus();
    });

    it('announces utilization changes to screen readers', () => {
      render(<SmartResourceCard employee={mockEmployee} capacityData={mockCapacityData} />);
      
      expect(screen.getByText('88% utilization')).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Integration with Real API', () => {
    it('fetches real allocation data on mount', async () => {
      render(<SmartResourceCard employee={mockEmployee} capacityData={mockCapacityData} />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/capacity',
          expect.objectContaining({
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
          })
        );
      });
    });

    it('handles API errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));
      
      render(<SmartResourceCard employee={mockEmployee} capacityData={[]} />);
      
      // Should still render the card without crashing
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('refreshes data when employee changes', async () => {
      const { rerender } = render(
        <SmartResourceCard employee={mockEmployee} capacityData={mockCapacityData} />
      );
      
      const newEmployee = { ...mockEmployee, id: 2, firstName: 'Jane' };
      rerender(<SmartResourceCard employee={newEmployee} capacityData={[]} />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });
});
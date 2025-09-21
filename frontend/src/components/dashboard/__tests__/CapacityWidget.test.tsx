import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { CapacityWidget } from '../CapacityWidget';

const mockCapacityData = {
  totalCapacity: 400,
  usedCapacity: 340,
  availableCapacity: 60,
  utilizationRate: 85,
  overAllocated: 5,
  teams: [
    {
      id: 'dev-team',
      name: 'Development Team',
      capacity: 200,
      utilized: 170,
      utilization: 85,
      status: 'healthy',
    },
    {
      id: 'design-team',
      name: 'Design Team',
      capacity: 100,
      utilized: 105,
      utilization: 105,
      status: 'over-allocated',
    },
    {
      id: 'qa-team',
      name: 'QA Team',
      capacity: 100,
      utilized: 65,
      utilization: 65,
      status: 'under-utilized',
    },
  ],
};

describe('CapacityWidget', () => {
  let mockOnDrillDown: any;

  beforeEach(() => {
    mockOnDrillDown = vi.fn();
  });

  it('should render capacity summary cards', () => {
    render(
      <CapacityWidget 
        data={mockCapacityData} 
        onDrillDown={mockOnDrillDown}
        loading={false}
      />
    );

    // Check main capacity metrics
    expect(screen.getByTestId('total-capacity')).toBeInTheDocument();
    expect(screen.getByTestId('used-capacity')).toBeInTheDocument();
    expect(screen.getByTestId('available-capacity')).toBeInTheDocument();
    expect(screen.getByTestId('utilization-rate')).toBeInTheDocument();

    // Check values
    expect(screen.getByText('400h')).toBeInTheDocument(); // Total capacity
    expect(screen.getByText('340h')).toBeInTheDocument(); // Used capacity
    expect(screen.getByText('60h')).toBeInTheDocument(); // Available capacity
    expect(screen.getByText('85%')).toBeInTheDocument(); // Utilization rate
  });

  it('should display color-coded utilization status', () => {
    render(
      <CapacityWidget 
        data={mockCapacityData} 
        onDrillDown={mockOnDrillDown}
        loading={false}
      />
    );

    // Check team cards with correct status colors
    const devTeamCard = screen.getByTestId('team-card-dev-team');
    const designTeamCard = screen.getByTestId('team-card-design-team');
    const qaTeamCard = screen.getByTestId('team-card-qa-team');

    expect(devTeamCard).toHaveClass('border-green-200'); // Healthy
    expect(designTeamCard).toHaveClass('border-red-200'); // Over-allocated
    expect(qaTeamCard).toHaveClass('border-yellow-200'); // Under-utilized
  });

  it('should show correct utilization percentages', () => {
    render(
      <CapacityWidget 
        data={mockCapacityData} 
        onDrillDown={mockOnDrillDown}
        loading={false}
      />
    );

    // Check team utilization percentages
    expect(screen.getByText('85%')).toBeInTheDocument(); // Dev team
    expect(screen.getByText('105%')).toBeInTheDocument(); // Design team (over-allocated)
    expect(screen.getByText('65%')).toBeInTheDocument(); // QA team
  });

  it('should handle click interactions for drill down', async () => {
    render(
      <CapacityWidget 
        data={mockCapacityData} 
        onDrillDown={mockOnDrillDown}
        loading={false}
      />
    );

    // Click on a team card
    const devTeamCard = screen.getByTestId('team-card-dev-team');
    await userEvent.click(devTeamCard);

    expect(mockOnDrillDown).toHaveBeenCalledWith('dev-team');
  });

  it('should handle click on main capacity card', async () => {
    render(
      <CapacityWidget 
        data={mockCapacityData} 
        onDrillDown={mockOnDrillDown}
        loading={false}
      />
    );

    // Click on main capacity overview
    const capacityOverview = screen.getByTestId('capacity-overview');
    await userEvent.click(capacityOverview);

    expect(mockOnDrillDown).toHaveBeenCalledWith('overview');
  });

  it('should show loading state', () => {
    render(
      <CapacityWidget 
        data={null}
        onDrillDown={mockOnDrillDown}
        loading={true}
      />
    );

    expect(screen.getByTestId('capacity-widget-loading')).toBeInTheDocument();
    expect(screen.getAllByTestId('skeleton')).toHaveLength(4); // 4 skeleton cards
  });

  it('should handle empty data gracefully', () => {
    const emptyData = {
      totalCapacity: 0,
      usedCapacity: 0,
      availableCapacity: 0,
      utilizationRate: 0,
      overAllocated: 0,
      teams: [],
    };

    render(
      <CapacityWidget 
        data={emptyData} 
        onDrillDown={mockOnDrillDown}
        loading={false}
      />
    );

    expect(screen.getByText('0h')).toBeInTheDocument(); // Total capacity
    expect(screen.getByText('0%')).toBeInTheDocument(); // Utilization rate
    expect(screen.getByText('No teams available')).toBeInTheDocument();
  });

  it('should display warning for over-allocation', () => {
    render(
      <CapacityWidget 
        data={mockCapacityData} 
        onDrillDown={mockOnDrillDown}
        loading={false}
      />
    );

    expect(screen.getByTestId('over-allocation-warning')).toBeInTheDocument();
    expect(screen.getByText('5h over-allocated')).toBeInTheDocument();
  });

  it('should show progress bars for team utilization', () => {
    render(
      <CapacityWidget 
        data={mockCapacityData} 
        onDrillDown={mockOnDrillDown}
        loading={false}
      />
    );

    // Check that progress bars are rendered for each team
    const progressBars = screen.getAllByTestId(/progress-bar/);
    expect(progressBars).toHaveLength(3); // One for each team

    // Check progress bar widths (approximate)
    const devProgressBar = screen.getByTestId('progress-bar-dev-team');
    const designProgressBar = screen.getByTestId('progress-bar-design-team');
    const qaProgressBar = screen.getByTestId('progress-bar-qa-team');

    expect(devProgressBar).toHaveStyle({ width: '85%' });
    expect(designProgressBar).toHaveStyle({ width: '100%' }); // Capped at 100%
    expect(qaProgressBar).toHaveStyle({ width: '65%' });
  });

  it('should have proper accessibility attributes', () => {
    render(
      <CapacityWidget 
        data={mockCapacityData} 
        onDrillDown={mockOnDrillDown}
        loading={false}
      />
    );

    // Check ARIA labels and roles
    const widget = screen.getByTestId('capacity-widget');
    expect(widget).toHaveAttribute('role', 'region');
    expect(widget).toHaveAttribute('aria-label', 'Team capacity overview');

    // Check team cards are interactive
    const teamCards = screen.getAllByRole('button');
    teamCards.forEach(card => {
      expect(card).toHaveAttribute('aria-label');
    });
  });

  it('should format hours correctly', () => {
    const dataWithLargeNumbers = {
      ...mockCapacityData,
      totalCapacity: 1000,
      usedCapacity: 850,
      availableCapacity: 150,
    };

    render(
      <CapacityWidget 
        data={dataWithLargeNumbers} 
        onDrillDown={mockOnDrillDown}
        loading={false}
      />
    );

    expect(screen.getByText('1,000h')).toBeInTheDocument();
    expect(screen.getByText('850h')).toBeInTheDocument();
    expect(screen.getByText('150h')).toBeInTheDocument();
  });
});

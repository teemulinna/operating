import React from 'react';
import { render, screen } from '@testing-library/react';
import { 
  LoadingSkeletons, 
  ResourceCardSkeleton, 
  CommandPaletteSkeleton,
  DashboardSkeleton,
  TableSkeleton,
  ChartSkeleton
} from '../../../components/ui/LoadingSkeletons';

describe('LoadingSkeletons', () => {
  describe('ResourceCardSkeleton', () => {
    it('renders with default props', () => {
      render(<ResourceCardSkeleton />);
      
      expect(screen.getByTestId('resource-card-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-avatar')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-name')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-position')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-progress-ring')).toBeInTheDocument();
    });

    it('renders multiple cards when count is specified', () => {
      render(<ResourceCardSkeleton count={3} />);
      
      const skeletons = screen.getAllByTestId('resource-card-skeleton');
      expect(skeletons).toHaveLength(3);
    });

    it('applies shimmer animation classes', () => {
      render(<ResourceCardSkeleton />);
      
      const skeleton = screen.getByTestId('resource-card-skeleton');
      expect(skeleton).toHaveClass('animate-pulse');
      
      const shimmerElements = screen.getAllByTestId(/skeleton-/);
      shimmerElements.forEach(element => {
        expect(element).toHaveClass('bg-gradient-to-r');
        expect(element).toHaveClass('from-gray-200');
        expect(element).toHaveClass('via-gray-300');
        expect(element).toHaveClass('to-gray-200');
        expect(element).toHaveClass('bg-animate-shimmer');
      });
    });

    it('has correct dimensions for different elements', () => {
      render(<ResourceCardSkeleton />);
      
      const avatar = screen.getByTestId('skeleton-avatar');
      expect(avatar).toHaveClass('w-12', 'h-12', 'rounded-full');
      
      const name = screen.getByTestId('skeleton-name');
      expect(name).toHaveClass('h-4', 'w-32');
      
      const position = screen.getByTestId('skeleton-position');
      expect(position).toHaveClass('h-3', 'w-24');
      
      const progressRing = screen.getByTestId('skeleton-progress-ring');
      expect(progressRing).toHaveClass('w-16', 'h-16', 'rounded-full');
    });

    it('renders skill badges skeleton', () => {
      render(<ResourceCardSkeleton />);
      
      const skillBadges = screen.getAllByTestId('skeleton-skill-badge');
      expect(skillBadges).toHaveLength(3); // Default 3 skill badges
      
      skillBadges.forEach(badge => {
        expect(badge).toHaveClass('h-6', 'w-16', 'rounded-full');
      });
    });

    it('renders calendar skeleton', () => {
      render(<ResourceCardSkeleton />);
      
      expect(screen.getByTestId('skeleton-calendar')).toBeInTheDocument();
      const calendarCells = screen.getAllByTestId('skeleton-calendar-cell');
      expect(calendarCells.length).toBeGreaterThan(20); // Month view has ~30 days
      
      calendarCells.forEach(cell => {
        expect(cell).toHaveClass('w-6', 'h-6', 'rounded');
      });
    });

    it('renders action buttons skeleton', () => {
      render(<ResourceCardSkeleton />);
      
      const actionButtons = screen.getAllByTestId('skeleton-action-button');
      expect(actionButtons).toHaveLength(3); // Schedule, Assign, Analytics
      
      actionButtons.forEach(button => {
        expect(button).toHaveClass('h-8', 'w-20', 'rounded');
      });
    });
  });

  describe('CommandPaletteSkeleton', () => {
    it('renders search input skeleton', () => {
      render(<CommandPaletteSkeleton />);
      
      expect(screen.getByTestId('command-palette-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-search-input')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-search-input')).toHaveClass('h-10', 'w-full', 'rounded-md');
    });

    it('renders result groups skeleton', () => {
      render(<CommandPaletteSkeleton />);
      
      expect(screen.getByTestId('skeleton-employees-group')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-projects-group')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-actions-group')).toBeInTheDocument();
    });

    it('renders correct number of result items', () => {
      render(<CommandPaletteSkeleton employeeCount={5} projectCount={3} actionCount={4} />);
      
      const employeeItems = screen.getAllByTestId('skeleton-employee-result');
      expect(employeeItems).toHaveLength(5);
      
      const projectItems = screen.getAllByTestId('skeleton-project-result');
      expect(projectItems).toHaveLength(3);
      
      const actionItems = screen.getAllByTestId('skeleton-action-result');
      expect(actionItems).toHaveLength(4);
    });

    it('applies shimmer effect to all elements', () => {
      render(<CommandPaletteSkeleton />);
      
      const skeleton = screen.getByTestId('command-palette-skeleton');
      expect(skeleton).toHaveClass('animate-pulse');
      
      const shimmerElements = screen.getAllByTestId(/skeleton-/);
      shimmerElements.forEach(element => {
        expect(element).toHaveClass('bg-gradient-to-r');
      });
    });

    it('has correct structure for result items', () => {
      render(<CommandPaletteSkeleton />);
      
      const employeeResults = screen.getAllByTestId('skeleton-employee-result');
      employeeResults.forEach(result => {
        expect(result).toHaveClass('flex', 'items-center', 'space-x-3', 'p-2');
      });
    });
  });

  describe('DashboardSkeleton', () => {
    it('renders dashboard header skeleton', () => {
      render(<DashboardSkeleton />);
      
      expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-dashboard-title')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-dashboard-subtitle')).toBeInTheDocument();
    });

    it('renders metrics cards skeleton', () => {
      render(<DashboardSkeleton />);
      
      const metricsCards = screen.getAllByTestId('skeleton-metric-card');
      expect(metricsCards).toHaveLength(4); // 4 metric cards in dashboard
      
      metricsCards.forEach(card => {
        expect(card).toHaveClass('p-6', 'rounded-lg');
        // Each card should have icon, value, and label
        expect(card.querySelector('[data-testid="skeleton-metric-icon"]')).toBeInTheDocument();
        expect(card.querySelector('[data-testid="skeleton-metric-value"]')).toBeInTheDocument();
        expect(card.querySelector('[data-testid="skeleton-metric-label"]')).toBeInTheDocument();
      });
    });

    it('renders tabs skeleton', () => {
      render(<DashboardSkeleton />);
      
      const tabs = screen.getAllByTestId('skeleton-tab');
      expect(tabs).toHaveLength(6); // 6 tabs in dashboard
      
      tabs.forEach(tab => {
        expect(tab).toHaveClass('h-10', 'w-24', 'rounded-md');
      });
    });

    it('renders content area skeleton', () => {
      render(<DashboardSkeleton />);
      
      expect(screen.getByTestId('skeleton-tab-content')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-tab-content')).toHaveClass('h-96', 'w-full', 'rounded-lg');
    });

    it('includes resource cards skeleton in content', () => {
      render(<DashboardSkeleton includeResourceCards={true} />);
      
      const resourceCards = screen.getAllByTestId('resource-card-skeleton');
      expect(resourceCards.length).toBeGreaterThan(0);
    });
  });

  describe('TableSkeleton', () => {
    it('renders with default row and column count', () => {
      render(<TableSkeleton />);
      
      expect(screen.getByTestId('table-skeleton')).toBeInTheDocument();
      
      const headerCells = screen.getAllByTestId('skeleton-table-header-cell');
      expect(headerCells).toHaveLength(4); // Default 4 columns
      
      const rows = screen.getAllByTestId('skeleton-table-row');
      expect(rows).toHaveLength(5); // Default 5 rows
    });

    it('renders custom number of rows and columns', () => {
      render(<TableSkeleton rows={3} columns={6} />);
      
      const headerCells = screen.getAllByTestId('skeleton-table-header-cell');
      expect(headerCells).toHaveLength(6);
      
      const rows = screen.getAllByTestId('skeleton-table-row');
      expect(rows).toHaveLength(3);
    });

    it('applies correct styling to table elements', () => {
      render(<TableSkeleton />);
      
      const table = screen.getByTestId('table-skeleton');
      expect(table).toHaveClass('w-full', 'border-collapse');
      
      const headerCells = screen.getAllByTestId('skeleton-table-header-cell');
      headerCells.forEach(cell => {
        expect(cell).toHaveClass('h-12', 'border-b');
      });
    });

    it('renders different cell widths for variety', () => {
      render(<TableSkeleton />);
      
      const cells = screen.getAllByTestId('skeleton-table-cell');
      const widths = Array.from(new Set(cells.map(cell => 
        Array.from(cell.classList).find(cls => cls.startsWith('w-'))
      )));
      
      expect(widths.length).toBeGreaterThan(1); // Should have variety in widths
    });
  });

  describe('ChartSkeleton', () => {
    it('renders bar chart skeleton by default', () => {
      render(<ChartSkeleton />);
      
      expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-chart-title')).toBeInTheDocument();
      
      const bars = screen.getAllByTestId('skeleton-chart-bar');
      expect(bars.length).toBeGreaterThan(0);
    });

    it('renders line chart skeleton when specified', () => {
      render(<ChartSkeleton type="line" />);
      
      expect(screen.getByTestId('skeleton-chart-line')).toBeInTheDocument();
    });

    it('renders pie chart skeleton when specified', () => {
      render(<ChartSkeleton type="pie" />);
      
      expect(screen.getByTestId('skeleton-chart-pie')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-chart-pie')).toHaveClass('rounded-full');
    });

    it('renders legend skeleton', () => {
      render(<ChartSkeleton showLegend={true} />);
      
      const legendItems = screen.getAllByTestId('skeleton-legend-item');
      expect(legendItems.length).toBeGreaterThan(0);
      
      legendItems.forEach(item => {
        expect(item.querySelector('[data-testid="skeleton-legend-color"]')).toBeInTheDocument();
        expect(item.querySelector('[data-testid="skeleton-legend-label"]')).toBeInTheDocument();
      });
    });

    it('renders axes labels for bar and line charts', () => {
      render(<ChartSkeleton type="bar" />);
      
      expect(screen.getByTestId('skeleton-x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-y-axis')).toBeInTheDocument();
    });

    it('has responsive dimensions', () => {
      render(<ChartSkeleton />);
      
      const chart = screen.getByTestId('chart-skeleton');
      expect(chart).toHaveClass('w-full');
    });
  });

  describe('Visual Regression Tests', () => {
    it('maintains consistent skeleton structure', () => {
      const { container } = render(<ResourceCardSkeleton />);
      
      // Test that the skeleton maintains the same DOM structure
      const skeleton = container.querySelector('[data-testid="resource-card-skeleton"]');
      expect(skeleton).toMatchSnapshot();
    });

    it('applies consistent shimmer animation timing', () => {
      render(<LoadingSkeletons.ResourceCard />);
      
      const animatedElements = screen.getAllByTestId(/skeleton-/);
      animatedElements.forEach(element => {
        const computedStyle = getComputedStyle(element);
        expect(computedStyle.animationDuration).toBe('2s');
        expect(computedStyle.animationIterationCount).toBe('infinite');
      });
    });

    it('maintains proper aspect ratios', () => {
      render(<ResourceCardSkeleton />);
      
      const progressRing = screen.getByTestId('skeleton-progress-ring');
      const computedStyle = getComputedStyle(progressRing);
      expect(computedStyle.width).toBe(computedStyle.height); // Should be square/circular
    });

    it('has proper contrast for accessibility', () => {
      render(<ResourceCardSkeleton />);
      
      const skeletonElements = screen.getAllByTestId(/skeleton-/);
      skeletonElements.forEach(element => {
        // Should have sufficient contrast between shimmer colors
        expect(element).toHaveClass('from-gray-200', 'to-gray-200');
        expect(element).toHaveClass('via-gray-300'); // Lighter middle for shimmer effect
      });
    });
  });

  describe('Performance', () => {
    it('renders large numbers of skeletons efficiently', () => {
      const startTime = performance.now();
      render(<ResourceCardSkeleton count={100} />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should render in less than 100ms
    });

    it('uses CSS animations instead of JavaScript for shimmer', () => {
      render(<ResourceCardSkeleton />);
      
      const skeleton = screen.getByTestId('resource-card-skeleton');
      expect(skeleton).toHaveClass('animate-pulse'); // Tailwind CSS animation
      
      // Should not have JavaScript-based animation attributes
      expect(skeleton).not.toHaveAttribute('data-animation-frame');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for screen readers', () => {
      render(<ResourceCardSkeleton />);
      
      const skeleton = screen.getByTestId('resource-card-skeleton');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading resource card');
      expect(skeleton).toHaveAttribute('role', 'status');
    });

    it('indicates loading state to assistive technology', () => {
      render(<DashboardSkeleton />);
      
      const skeleton = screen.getByTestId('dashboard-skeleton');
      expect(skeleton).toHaveAttribute('aria-live', 'polite');
      expect(skeleton).toHaveAttribute('aria-busy', 'true');
    });

    it('provides appropriate screen reader text', () => {
      render(<CommandPaletteSkeleton />);
      
      expect(screen.getByText('Loading command palette...')).toBeInTheDocument();
      expect(screen.getByText('Loading command palette...')).toHaveClass('sr-only');
    });
  });
});
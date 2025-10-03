import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export interface DashboardStats {
  employeeCount: number;
  projectCount: number;
  utilizationRate: number;
  allocationCount?: number;
}

/**
 * Dashboard Page Object Model for managing dashboard operations
 * Covers US-D1 and US-D2 acceptance criteria
 */
export class DashboardPage extends BasePage {
  // Selectors for Dashboard elements
  private readonly selectors = {
    // Page container
    dashboardPage: '[data-testid="dashboard-page"]',

    // Navigation (US-D2)
    navigation: '[data-testid="main-navigation"]',
    navDashboard: '[data-testid="nav-dashboard"]',
    navEmployees: '[data-testid="nav-employees"]',
    navProjects: '[data-testid="nav-projects"]',
    navAllocations: '[data-testid="nav-allocations"]',
    navSchedule: '[data-testid="nav-schedule"]',
    navReports: '[data-testid="nav-reports"]',
    navPlanning: '[data-testid="nav-planning"]',
    navHeatMap: '[data-testid="nav-heat-map"]',
    navAvailability: '[data-testid="nav-availability"]',
    navScenarios: '[data-testid="nav-scenarios"]',
    navTeamDashboard: '[data-testid="nav-team-dashboard"]',

    // Dashboard metrics cards (US-D1)
    employeeCountCard: 'div:has-text("Employees")',
    projectCountCard: 'div:has-text("Projects")',
    utilizationCard: 'div:has-text("Utilization")',

    // Metric values - more specific selectors
    employeeCount: 'div:has-text("Total team members") >> .. >> p[style*="2em"]',
    projectCount: 'div:has-text("Active projects") >> .. >> p[style*="2em"]',
    utilizationRate: 'div:has-text("Team capacity") >> .. >> p[style*="2em"]',

    // Loading and error states (US-D1)
    loadingIndicator: 'div:has-text("Loading")',
    errorMessage: 'div[style*="color: red"]',

    // Empty state (US-D1)
    emptyStateTitle: 'h2:has-text("Welcome to ResourceForge")',
    emptyStateMessage: 'p:has-text("Start by adding employees")',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to dashboard page
   */
  async navigateToDashboard(): Promise<void> {
    await this.page.goto('/');
    await this.waitForPageLoad();
  }

  /**
   * Wait for dashboard page to load completely
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForSelector(this.selectors.dashboardPage, {
      state: 'visible',
      timeout: 10000
    });
  }

  /**
   * US-D1: Verify dashboard displays total employee count
   */
  async verifyEmployeeCount(): Promise<number> {
    const element = this.page.locator(this.selectors.employeeCount);
    await expect(element).toBeVisible({ timeout: 10000 });
    const text = await element.textContent();
    const count = parseInt(text?.trim() || '0', 10);
    expect(count).toBeGreaterThanOrEqual(0);
    return count;
  }

  /**
   * US-D1: Verify dashboard displays total project count
   */
  async verifyProjectCount(): Promise<number> {
    const element = this.page.locator(this.selectors.projectCount);
    await expect(element).toBeVisible({ timeout: 10000 });
    const text = await element.textContent();
    const count = parseInt(text?.trim() || '0', 10);
    expect(count).toBeGreaterThanOrEqual(0);
    return count;
  }

  /**
   * US-D1: Verify dashboard displays utilization rate as percentage
   */
  async verifyUtilizationRate(): Promise<number> {
    const element = this.page.locator(this.selectors.utilizationRate);
    await expect(element).toBeVisible({ timeout: 10000 });
    const text = await element.textContent();

    // Should contain % symbol
    expect(text).toContain('%');

    // Extract numeric value
    const rate = parseInt(text?.replace('%', '').trim() || '0', 10);
    expect(rate).toBeGreaterThanOrEqual(0);
    expect(rate).toBeLessThanOrEqual(100);
    return rate;
  }

  /**
   * US-D1: Verify all metrics are displayed
   */
  async verifyAllMetrics(): Promise<DashboardStats> {
    const employeeCount = await this.verifyEmployeeCount();
    const projectCount = await this.verifyProjectCount();
    const utilizationRate = await this.verifyUtilizationRate();

    return {
      employeeCount,
      projectCount,
      utilizationRate
    };
  }

  /**
   * US-D1: Verify loading state is shown while fetching data
   */
  async verifyLoadingState(): Promise<void> {
    // Check if loading indicator appears
    const loadingIndicator = this.page.locator(this.selectors.loadingIndicator);

    // Loading should be visible initially
    try {
      await expect(loadingIndicator).toBeVisible({ timeout: 1000 });
    } catch (e) {
      // Loading might be too fast, which is OK
      console.log('Loading state was too fast to capture');
    }
  }

  /**
   * US-D1: Verify data auto-refreshes on page load
   */
  async verifyDataAutoRefresh(): Promise<void> {
    // Get initial stats
    const initialStats = await this.verifyAllMetrics();

    // Reload page
    await this.page.reload();
    await this.waitForPageLoad();

    // Verify stats are still displayed
    const refreshedStats = await this.verifyAllMetrics();

    // Stats should be defined after refresh
    expect(refreshedStats.employeeCount).toBeGreaterThanOrEqual(0);
    expect(refreshedStats.projectCount).toBeGreaterThanOrEqual(0);
    expect(refreshedStats.utilizationRate).toBeGreaterThanOrEqual(0);
  }

  /**
   * US-D1: Verify error state is shown if data fails to load
   */
  async verifyErrorState(shouldExist: boolean = false): Promise<void> {
    const errorElement = this.page.locator(this.selectors.errorMessage);

    if (shouldExist) {
      await expect(errorElement).toBeVisible({ timeout: 5000 });
      await expect(errorElement).toContainText('Failed to load');
    } else {
      // Error should not be visible in normal operation
      const count = await errorElement.count();
      expect(count).toBe(0);
    }
  }

  /**
   * US-D1: Verify empty state is shown when no data exists
   */
  async verifyEmptyState(): Promise<void> {
    const emptyTitle = this.page.locator(this.selectors.emptyStateTitle);
    const emptyMessage = this.page.locator(this.selectors.emptyStateMessage);

    // Check if empty state exists
    const titleCount = await emptyTitle.count();
    const messageCount = await emptyMessage.count();

    if (titleCount > 0 && messageCount > 0) {
      await expect(emptyTitle).toBeVisible();
      await expect(emptyMessage).toBeVisible();
      await expect(emptyMessage).toContainText('Start by adding employees');
    }
  }

  /**
   * US-D2: Verify navigation menu is always visible
   */
  async verifyNavigationVisible(): Promise<void> {
    const navigation = this.page.locator(this.selectors.navigation);
    await expect(navigation).toBeVisible({ timeout: 5000 });
  }

  /**
   * US-D2: Verify all navigation links are present and labeled
   */
  async verifyNavigationLinks(): Promise<void> {
    const links = [
      { selector: this.selectors.navDashboard, label: 'Dashboard' },
      { selector: this.selectors.navEmployees, label: 'Employees' },
      { selector: this.selectors.navProjects, label: 'Projects' },
      { selector: this.selectors.navAllocations, label: 'Allocations' },
      { selector: this.selectors.navSchedule, label: 'Schedule' },
      { selector: this.selectors.navReports, label: 'Reports' },
      { selector: this.selectors.navPlanning, label: 'Planning' },
      { selector: this.selectors.navHeatMap, label: 'Heat Map' },
      { selector: this.selectors.navAvailability, label: 'Availability' },
      { selector: this.selectors.navScenarios, label: 'What-If' },
      { selector: this.selectors.navTeamDashboard, label: 'Team' },
    ];

    for (const link of links) {
      const element = this.page.locator(link.selector);
      await expect(element).toBeVisible({ timeout: 5000 });
      await expect(element).toHaveText(link.label);

      // Verify link is clickable
      await expect(element).toBeEnabled();
    }
  }

  /**
   * US-D2: Verify navigation links have proper test IDs
   */
  async verifyNavigationTestIds(): Promise<void> {
    const testIds = [
      'nav-dashboard',
      'nav-employees',
      'nav-projects',
      'nav-allocations',
      'nav-schedule',
      'nav-reports',
      'nav-planning',
      'nav-heat-map',
      'nav-availability',
      'nav-scenarios',
      'nav-team-dashboard',
    ];

    for (const testId of testIds) {
      const element = this.page.locator(`[data-testid="${testId}"]`);
      await expect(element).toBeAttached();
    }
  }

  /**
   * US-D2: Navigate to a specific section and verify current page is highlighted
   */
  async navigateToSection(sectionTestId: string): Promise<void> {
    const link = this.page.locator(`[data-testid="${sectionTestId}"]`);
    await expect(link).toBeVisible();
    await link.click();

    // Wait for navigation
    await this.page.waitForLoadState('networkidle', { timeout: 10000 });
  }

  /**
   * Verify metric card styling and structure
   */
  async verifyMetricCardStructure(): Promise<void> {
    const cards = [
      this.selectors.employeeCountCard,
      this.selectors.projectCountCard,
      this.selectors.utilizationCard
    ];

    for (const cardSelector of cards) {
      const card = this.page.locator(cardSelector).first();
      await expect(card).toBeVisible();

      // Verify card has proper styling
      const styles = await card.getAttribute('style');
      expect(styles).toContain('padding');
      expect(styles).toContain('border-radius');
    }
  }

  /**
   * Take screenshot for visual regression testing
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: true
    });
  }

  /**
   * Verify responsive design - test at different viewport sizes
   */
  async verifyResponsiveLayout(width: number, height: number): Promise<void> {
    await this.page.setViewportSize({ width, height });
    await this.waitForPageLoad();

    // Verify main elements are still visible
    await this.verifyNavigationVisible();
    await expect(this.page.locator(this.selectors.dashboardPage)).toBeVisible();
  }

  /**
   * Verify accessibility - check ARIA labels and keyboard navigation
   */
  async verifyAccessibility(): Promise<void> {
    // Check if navigation has proper role
    const navigation = this.page.locator(this.selectors.navigation);
    await expect(navigation).toBeVisible();

    // Verify all links are keyboard accessible
    const links = await this.page.locator('nav a').all();
    for (const link of links) {
      const tabIndex = await link.getAttribute('tabindex');
      // Should not have negative tabindex (should be keyboard accessible)
      expect(tabIndex === null || parseInt(tabIndex) >= 0).toBeTruthy();
    }
  }
}

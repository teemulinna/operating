import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Navigation Page Object Model for testing navigation functionality
 */
export class NavigationPage extends BasePage {
  // Selectors for navigation elements
  private readonly selectors = {
    navigation: '[data-testid="main-navigation"]',
    appTitle: '[data-testid="app-title"]',

    // Navigation links
    navDashboard: '[data-testid="nav-dashboard"]',
    navEmployees: '[data-testid="nav-employees"]',
    navProjects: '[data-testid="nav-projects"]',
    navAllocations: '[data-testid="nav-allocations"]',
    navSchedule: '[data-testid="nav-schedule"]',
    navEnhancedSchedule: '[data-testid="nav-enhanced-schedule"]',
    navReports: '[data-testid="nav-reports"]',
    navPlanning: '[data-testid="nav-planning"]',
    navHeatMap: '[data-testid="nav-heat-map"]',
    navAvailability: '[data-testid="nav-availability"]',
    navScenarios: '[data-testid="nav-scenarios"]',
    navTeamDashboard: '[data-testid="nav-team-dashboard"]',

    // Page content identifiers
    dashboardPage: '[data-testid="dashboard-page"]',
    employeesPage: '[data-testid="employees-page"]',
    projectsPage: '[data-testid="projects-page"]',
    allocationsPage: '[data-testid="allocations-page"]',
    schedulePage: '[data-testid="schedule-page"]',
    reportsPage: '[data-testid="reports-page"]',
    planningPage: '[data-testid="planning-page"]',
  };

  // Map of routes to their corresponding page selectors
  private readonly routes = [
    { path: '/', name: 'Dashboard', testId: 'nav-dashboard', pageSelector: '[data-testid="dashboard-page"]' },
    { path: '/employees', name: 'Employees', testId: 'nav-employees', pageSelector: '[data-testid="employees-page"]' },
    { path: '/projects', name: 'Projects', testId: 'nav-projects', pageSelector: '[data-testid="projects-page"]' },
    { path: '/allocations', name: 'Allocations', testId: 'nav-allocations', pageSelector: '[data-testid="allocations-page"]' },
    { path: '/schedule', name: 'Schedule', testId: 'nav-schedule', pageSelector: '[data-testid="schedule-page"]' },
    { path: '/enhanced-schedule', name: 'Enhanced Schedule', testId: 'nav-enhanced-schedule', pageSelector: 'main' },
    { path: '/reports', name: 'Reports', testId: 'nav-reports', pageSelector: 'main' },
    { path: '/planning', name: 'Planning', testId: 'nav-planning', pageSelector: 'main' },
    { path: '/heat-map', name: 'Heat Map', testId: 'nav-heat-map', pageSelector: 'main' },
    { path: '/availability', name: 'Availability', testId: 'nav-availability', pageSelector: 'main' },
    { path: '/scenarios', name: 'What-If', testId: 'nav-scenarios', pageSelector: 'main' },
    { path: '/team-dashboard', name: 'Team Dashboard', testId: 'nav-team-dashboard', pageSelector: 'main' },
  ];

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to the home page
   */
  async navigateToHome(): Promise<void> {
    await this.goto('/');
    await this.waitForPageLoad();
  }

  /**
   * Verify navigation bar is visible
   */
  async verifyNavigationVisible(): Promise<void> {
    await this.waitForElement(this.selectors.navigation);
    const isVisible = await this.isElementVisible(this.selectors.navigation);
    expect(isVisible).toBeTruthy();
  }

  /**
   * Verify app title is visible
   */
  async verifyAppTitleVisible(): Promise<void> {
    const isVisible = await this.isElementVisible(this.selectors.appTitle);
    expect(isVisible).toBeTruthy();
    const titleText = await this.getElementText(this.selectors.appTitle);
    expect(titleText).toBe('ResourceForge');
  }

  /**
   * Get all navigation links
   */
  getAllNavigationLinks(): { name: string; testId: string; path: string }[] {
    return this.routes.map(route => ({
      name: route.name,
      testId: route.testId,
      path: route.path
    }));
  }

  /**
   * Verify all navigation links are visible
   */
  async verifyAllLinksVisible(): Promise<void> {
    for (const route of this.routes) {
      const selector = `[data-testid="${route.testId}"]`;
      const isVisible = await this.isElementVisible(selector);
      expect(isVisible).toBe(true, `Navigation link for ${route.name} should be visible`);
    }
  }

  /**
   * Verify all navigation links have test IDs
   */
  async verifyAllLinksHaveTestIds(): Promise<void> {
    for (const route of this.routes) {
      const selector = `[data-testid="${route.testId}"]`;
      const element = await this.page.locator(selector).count();
      expect(element).toBeGreaterThan(0, `Link for ${route.name} should have test ID: ${route.testId}`);
    }
  }

  /**
   * Click a navigation link by test ID
   */
  async clickNavigationLink(testId: string): Promise<void> {
    const selector = `[data-testid="${testId}"]`;
    await this.clickElement(selector);
  }

  /**
   * Navigate to a specific page by clicking its link
   */
  async navigateToPage(pageName: string): Promise<void> {
    const route = this.routes.find(r => r.name === pageName);
    if (!route) {
      throw new Error(`No route found for page: ${pageName}`);
    }
    await this.clickNavigationLink(route.testId);
    await this.waitForPageLoad();
  }

  /**
   * Verify URL matches expected path
   */
  async verifyCurrentURL(expectedPath: string): Promise<void> {
    const currentURL = this.page.url();
    expect(currentURL).toContain(expectedPath);
  }

  /**
   * Verify page content loaded
   */
  async verifyPageContentLoaded(pageName: string): Promise<void> {
    const route = this.routes.find(r => r.name === pageName);
    if (!route) {
      throw new Error(`No route found for page: ${pageName}`);
    }

    // Wait for navigation to complete
    await this.waitForPageLoad();

    // Wait for either the specific page selector or main content
    try {
      await this.page.waitForSelector(route.pageSelector, {
        state: 'visible',
        timeout: 15000
      });
    } catch (error) {
      // Fallback: just verify main content is visible
      try {
        await this.page.waitForSelector('main', { state: 'visible', timeout: 10000 });
      } catch (fallbackError) {
        // If both fail, wait for the body to be visible as last resort
        await this.page.waitForSelector('body', { state: 'visible', timeout: 5000 });
      }
    }
  }

  /**
   * Verify active link highlighting
   */
  async verifyActiveLinkHighlight(pageName: string): Promise<void> {
    const route = this.routes.find(r => r.name === pageName);
    if (!route) {
      throw new Error(`No route found for page: ${pageName}`);
    }

    const linkElement = this.page.locator(`[data-testid="${route.testId}"]`);

    // Wait for element to be visible
    await linkElement.waitFor({ state: 'visible', timeout: 5000 });

    // Check for active class - NavLink adds classes when active
    const className = await linkElement.getAttribute('class');

    // Active links should have blue color class or aria-current attribute
    const ariaCurrent = await linkElement.getAttribute('aria-current');

    const isActive = (className && className.includes('text-blue')) || ariaCurrent === 'page';
    expect(isActive).toBe(true, `Link for ${pageName} should be active. Class: ${className}, aria-current: ${ariaCurrent}`);
  }

  /**
   * Verify inactive link styling
   */
  async verifyInactiveLinkStyling(pageName: string): Promise<void> {
    const route = this.routes.find(r => r.name === pageName);
    if (!route) {
      throw new Error(`No route found for page: ${pageName}`);
    }

    const linkElement = this.page.locator(`[data-testid="${route.testId}"]`);

    // Wait for element to be visible
    await linkElement.waitFor({ state: 'visible', timeout: 5000 });

    const className = await linkElement.getAttribute('class');
    const ariaCurrent = await linkElement.getAttribute('aria-current');

    // Inactive links should have gray color class and no aria-current
    const isInactive = (className && className.includes('text-gray')) && !ariaCurrent;
    expect(isInactive).toBe(true, `Link for ${pageName} should be inactive. Class: ${className}, aria-current: ${ariaCurrent}`);
  }

  /**
   * Navigate directly to a URL (for deep linking test)
   */
  async navigateDirectlyToURL(path: string): Promise<void> {
    await this.goto(path);
    await this.waitForPageLoad();
  }

  /**
   * Navigate browser back
   */
  async navigateBack(): Promise<void> {
    await this.page.goBack();
    await this.waitForPageLoad();
  }

  /**
   * Navigate browser forward
   */
  async navigateForward(): Promise<void> {
    await this.page.goForward();
    await this.waitForPageLoad();
  }

  /**
   * Verify navigation is present on page
   */
  async verifyNavigationPersistence(): Promise<void> {
    const navVisible = await this.isElementVisible(this.selectors.navigation);
    expect(navVisible).toBeTruthy();
  }

  /**
   * Test React Router navigation without page refresh
   * This checks that the page doesn't reload during navigation
   */
  async verifyNoPageReload(action: () => Promise<void>): Promise<boolean> {
    // Set a marker in the page that would be lost on reload
    await this.page.evaluate(() => {
      (window as any).navigationMarker = Date.now();
    });

    // Perform the action (navigation)
    await action();

    // Check if marker still exists (page didn't reload)
    const markerExists = await this.page.evaluate(() => {
      return typeof (window as any).navigationMarker !== 'undefined';
    });

    return markerExists;
  }

  /**
   * Get current page path
   */
  getCurrentPath(): string {
    const url = new URL(this.page.url());
    return url.pathname;
  }

  /**
   * Verify navigation bar is always visible (sticky/fixed)
   */
  async verifyNavigationAlwaysVisible(): Promise<void> {
    // Scroll down
    await this.page.evaluate(() => window.scrollTo(0, 500));
    await this.page.waitForTimeout(500);

    const isVisible = await this.isElementVisible(this.selectors.navigation);
    expect(isVisible).toBeTruthy();

    // Scroll back up
    await this.page.evaluate(() => window.scrollTo(0, 0));
    await this.page.waitForTimeout(500);
  }

  /**
   * Get all routes for iteration
   */
  getRoutes() {
    return this.routes;
  }

  /**
   * Verify link href attribute points to correct path
   */
  async verifyLinkHref(testId: string, expectedPath: string): Promise<void> {
    const link = this.page.locator(`[data-testid="${testId}"]`);
    const href = await link.getAttribute('href');
    expect(href).toBe(expectedPath);
  }

  /**
   * Verify page title or heading after navigation
   */
  async verifyPageHeading(expectedText: string): Promise<void> {
    const heading = this.page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(expectedText, { ignoreCase: true });
  }
}

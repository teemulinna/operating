import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for Team Dashboard functionality
 * Handles all interactions with dashboard widgets, filters, and real-time updates
 */
export class TeamDashboardPage extends BasePage {
  // Dashboard widget selectors
  private readonly dashboardContainer = '[data-testid="dashboard-container"]';
  private readonly overallUtilizationWidget = '[data-testid="overall-utilization-widget"]';
  private readonly teamUtilizationWidget = '[data-testid="team-utilization-widget"]';
  private readonly projectTimelineWidget = '[data-testid="project-timeline-widget"]';
  private readonly capacityAlertsWidget = '[data-testid="capacity-alerts-widget"]';
  private readonly utilizationHeatmap = '[data-testid="utilization-heatmap"]';
  
  // Filter and control selectors
  private readonly teamFilter = '[data-testid="team-filter"]';
  private readonly dateRangeFilter = '[data-testid="date-range-filter"]';
  private readonly employeeSearch = '[data-testid="employee-search"]';
  private readonly exportButton = '[data-testid="export-button"]';
  
  // Alert and notification selectors
  private readonly overAllocationAlert = '[data-testid="over-allocation-alert"]';
  private readonly capacityAlert = '[data-testid="capacity-alert"]';
  private readonly teamCapacityAlert = '[data-testid="team-capacity-alert"]';

  constructor(page: Page, baseUrl?: string) {
    super(page, baseUrl);
  }

  /**
   * Navigation methods
   */
  async navigate(path: string = '/dashboard') {
    await super.navigate(path);
  }

  async waitForDashboardWidgetsLoad() {
    await Promise.all([
      this.waitForVisible(this.page.locator(this.overallUtilizationWidget)),
      this.waitForVisible(this.page.locator(this.teamUtilizationWidget)),
      this.waitForVisible(this.page.locator(this.projectTimelineWidget)),
      this.waitForVisible(this.page.locator(this.capacityAlertsWidget))
    ]);
  }

  async waitForAllWidgetsLoad() {
    await this.waitForDashboardWidgetsLoad();
    await this.waitForVisible(this.page.locator(this.utilizationHeatmap));
  }

  async waitForDashboardUpdate() {
    // Wait for loading indicators to disappear
    await this.page.waitForFunction(() => {
      const loadingIndicators = document.querySelectorAll('[data-testid*="loading"]');
      return loadingIndicators.length === 0;
    }, { timeout: 10000 });
  }

  /**
   * Utilization widget methods
   */
  async getOverallUtilization(): Promise<string> {
    const widget = this.page.locator(this.overallUtilizationWidget);
    const utilizationText = widget.locator('[data-testid="utilization-percentage"]');
    return await utilizationText.textContent() || '0%';
  }

  async getOverallUtilizationWidget(): Locator {
    return this.page.locator(this.overallUtilizationWidget);
  }

  async getTeamUtilizationWidget(): Locator {
    return this.page.locator(this.teamUtilizationWidget);
  }

  async getProjectTimelineWidget(): Locator {
    return this.page.locator(this.projectTimelineWidget);
  }

  async getCapacityAlertsWidget(): Locator {
    return this.page.locator(this.capacityAlertsWidget);
  }

  async clickOverallUtilizationWidget() {
    await this.clickElement(this.page.locator(this.overallUtilizationWidget));
  }

  async getUtilizationDetailsModal(): Locator {
    return this.page.locator('[data-testid="utilization-details-modal"]');
  }

  /**
   * Employee utilization methods
   */
  async getEmployeeUtilizationWidget(employeeId: string): Locator {
    return this.page.locator(`[data-testid="employee-utilization-${employeeId}"]`);
  }

  async getEmployeeUtilization(employeeId: string): Promise<string> {
    const widget = this.getEmployeeUtilizationWidget(employeeId);
    const utilizationElement = widget.locator('[data-testid="utilization-value"]');
    return await utilizationElement.textContent() || '0%';
  }

  async getEmployeeCumulativeUtilization(employeeId: string): Promise<string> {
    const widget = this.getEmployeeUtilizationWidget(employeeId);
    const cumulativeElement = widget.locator('[data-testid="cumulative-utilization"]');
    const text = await cumulativeElement.textContent() || '0%';
    return text.replace('%', '');
  }

  async getVisibleEmployeeWidgets(): Promise<Locator[]> {
    const widgets = this.page.locator('[data-testid^="employee-utilization-"]');
    const count = await widgets.count();
    const results = [];
    
    for (let i = 0; i < count; i++) {
      results.push(widgets.nth(i));
    }
    
    return results;
  }

  async getVisibleEmployeeCount(): Promise<number> {
    const widgets = this.page.locator('[data-testid^="employee-utilization-"]');
    return await widgets.count();
  }

  async getVisibleEmployeeNames(): Promise<string[]> {
    const widgets = this.page.locator('[data-testid^="employee-utilization-"] [data-testid="employee-name"]');
    return await widgets.allTextContents();
  }

  /**
   * Heatmap methods
   */
  async getUtilizationHeatmap(): Locator {
    return this.page.locator(this.utilizationHeatmap);
  }

  async waitForHeatmapLoad() {
    await this.waitForVisible(this.page.locator(this.utilizationHeatmap));
    await this.page.waitForFunction(() => {
      const heatmap = document.querySelector('[data-testid="utilization-heatmap"]');
      return heatmap && heatmap.children.length > 0;
    });
  }

  async getHeatmapDateRange(): Promise<string> {
    const dateRangeElement = this.page.locator('[data-testid="heatmap-date-range"]');
    return await dateRangeElement.textContent() || '';
  }

  async getHeatmapCellsByUtilization(level: string): Locator {
    return this.page.locator(`[data-testid="heatmap-cell"][data-utilization-level="${level}"]`);
  }

  async getHeatmapCell(date: string): Locator {
    return this.page.locator(`[data-testid="heatmap-cell"][data-date="${date}"]`);
  }

  async getHeatmapTooltip(): Locator {
    return this.page.locator('[data-testid="heatmap-tooltip"]');
  }

  /**
   * Timeline widget methods
   */
  async waitForTimelineWidgetLoad() {
    await this.waitForVisible(this.page.locator(this.projectTimelineWidget));
    await this.page.waitForFunction(() => {
      const timeline = document.querySelector('[data-testid="project-timeline-widget"]');
      const projects = timeline?.querySelectorAll('[data-testid="timeline-project"]');
      return projects && projects.length >= 0; // Allow for empty state
    });
  }

  async getActiveProjectsInTimeline(): Locator {
    return this.page.locator('[data-testid="timeline-project"][data-status="active"]');
  }

  async getProjectDetailsPopup(): Locator {
    return this.page.locator('[data-testid="project-details-popup"]');
  }

  /**
   * Alert methods
   */
  async getCapacityAlert(): Locator {
    return this.page.locator(this.capacityAlert);
  }

  async getOverAllocationAlert(): Locator {
    return this.page.locator(this.overAllocationAlert);
  }

  async getTeamCapacityAlert(): Locator {
    return this.page.locator(this.teamCapacityAlert);
  }

  async getIndividualCapacityAlerts(): Locator {
    return this.page.locator('[data-testid="individual-capacity-alert"]');
  }

  async clickOverAllocationAlert() {
    await this.clickElement(this.page.locator(this.overAllocationAlert));
  }

  async getAllocationDetailsModal(): Locator {
    return this.page.locator('[data-testid="allocation-details-modal"]');
  }

  async getCapacitySuggestionsModal(): Locator {
    return this.page.locator('[data-testid="capacity-suggestions-modal"]');
  }

  async getSuggestion(type: string): Locator {
    return this.page.locator(`[data-testid="suggestion-${type}"]`);
  }

  async clickSuggestion(type: string) {
    await this.clickElement(this.getSuggestion(type));
  }

  async getAllocationAdjustmentForm(): Locator {
    return this.page.locator('[data-testid="allocation-adjustment-form"]');
  }

  /**
   * Filter methods
   */
  async openTeamFilter() {
    await this.clickElement(this.page.locator(this.teamFilter));
  }

  async selectDepartment(department: string, options?: { addToSelection?: boolean }) {
    const departmentOption = this.page.locator(`[data-testid="department-option"][data-value="${department}"]`);
    
    if (options?.addToSelection) {
      // Use Ctrl/Cmd + click for multi-select
      await departmentOption.click({ modifiers: ['ControlOrMeta'] });
    } else {
      await this.clickElement(departmentOption);
    }
  }

  async applyFilter() {
    await this.clickElement(this.page.locator('[data-testid="apply-filter"]'));
    await this.waitForDashboardUpdate();
  }

  async setDateRange(startDate: string, endDate: string) {
    const dateRangeElement = this.page.locator(this.dateRangeFilter);
    await this.clickElement(dateRangeElement);
    
    const startDateInput = this.page.locator('[data-testid="filter-start-date"]');
    const endDateInput = this.page.locator('[data-testid="filter-end-date"]');
    
    await this.fillInput(startDateInput, startDate);
    await this.fillInput(endDateInput, endDate);
    
    await this.clickElement(this.page.locator('[data-testid="apply-date-range"]'));
  }

  async setCustomDateRange(startDate: string, endDate: string) {
    await this.clickElement(this.page.locator('[data-testid="custom-date-range"]'));
    await this.setDateRange(startDate, endDate);
  }

  async searchEmployees(searchTerm: string) {
    const searchInput = this.page.locator(this.employeeSearch);
    await this.fillInput(searchInput, searchTerm);
    await this.waitForDashboardUpdate();
  }

  async clearEmployeeSearch() {
    const searchInput = this.page.locator(this.employeeSearch);
    await searchInput.clear();
    await this.page.keyboard.press('Enter');
    await this.waitForDashboardUpdate();
  }

  async waitForSearchResults() {
    await this.page.waitForFunction(() => {
      const searchInput = document.querySelector('[data-testid="employee-search"]') as HTMLInputElement;
      const loadingIndicator = document.querySelector('[data-testid="search-loading"]');
      return searchInput && !loadingIndicator;
    });
  }

  /**
   * Export methods
   */
  async clickExportButton() {
    await this.clickElement(this.page.locator(this.exportButton));
  }

  async getExportModal(): Locator {
    return this.page.locator('[data-testid="export-modal"]');
  }

  async selectExportType(type: string) {
    const typeOption = this.page.locator(`[data-testid="export-type-${type}"]`);
    await this.clickElement(typeOption);
  }

  async selectExportFormat(format: string) {
    const formatOption = this.page.locator(`[data-testid="export-format-${format}"]`);
    await this.clickElement(formatOption);
  }

  async setExportDateRange(startDate: string, endDate: string) {
    const startInput = this.page.locator('[data-testid="export-start-date"]');
    const endInput = this.page.locator('[data-testid="export-end-date"]');
    
    await this.fillInput(startInput, startDate);
    await this.fillInput(endInput, endDate);
  }

  async confirmExport() {
    await this.clickElement(this.page.locator('[data-testid="confirm-export"]'));
  }

  async getExportSuccessMessage(): Locator {
    return this.page.locator('[data-testid="export-success-message"]');
  }

  /**
   * Capacity forecasting methods
   */
  async openCapacityForecast() {
    await this.clickElement(this.page.locator('[data-testid="capacity-forecast-button"]'));
  }

  async setForecastPeriod(period: string) {
    const select = this.page.locator('[data-testid="forecast-period"]');
    await this.selectOption(select, period);
  }

  async setForecastScenario(scenario: string) {
    const select = this.page.locator('[data-testid="forecast-scenario"]');
    await this.selectOption(select, scenario);
  }

  async includeNewHires(include: boolean) {
    const checkbox = this.page.locator('[data-testid="include-new-hires"]');
    if (include) {
      await checkbox.check();
    } else {
      await checkbox.uncheck();
    }
  }

  async generateForecast() {
    await this.clickElement(this.page.locator('[data-testid="generate-forecast"]'));
  }

  async waitForForecastGeneration() {
    await this.page.waitForFunction(() => {
      const loadingIndicator = document.querySelector('[data-testid="forecast-loading"]');
      return !loadingIndicator;
    }, { timeout: 30000 });
  }

  async getForecastChart(): Locator {
    return this.page.locator('[data-testid="forecast-chart"]');
  }

  async getForecastSummary(): Locator {
    return this.page.locator('[data-testid="forecast-summary"]');
  }

  async exportForecast(format: string) {
    await this.clickElement(this.page.locator(`[data-testid="export-forecast-${format}"]`));
  }

  /**
   * Capacity settings methods
   */
  async openCapacitySettings() {
    await this.clickElement(this.page.locator('[data-testid="capacity-settings-button"]'));
  }

  async setCapacityThreshold(type: string, value: number) {
    const input = this.page.locator(`[data-testid="capacity-threshold-${type}"]`);
    await this.fillInput(input, value.toString());
  }

  async saveCapacitySettings() {
    await this.clickElement(this.page.locator('[data-testid="save-capacity-settings"]'));
  }

  /**
   * Performance testing methods
   */
  async enableLargeDatasetMode() {
    await this.page.evaluate(() => {
      (window as any).enableLargeDatasetMode = true;
    });
  }

  async getEmployeeListContainer(): Locator {
    return this.page.locator('[data-testid="employee-list-container"]');
  }

  async getScrollIndicator(): Locator {
    return this.page.locator('[data-testid="scroll-indicator"]');
  }

  /**
   * Real-time update methods
   */
  async enableRealTimeUpdates() {
    await this.page.evaluate(() => {
      // Enable WebSocket connection monitoring
      if (!(window as any).realTimeMonitoring) {
        (window as any).realTimeMonitoring = true;
      }
    });
  }

  async waitForRealTimeUpdate(timeout: number = 5000) {
    await this.page.waitForFunction(() => {
      return (window as any).lastUpdateTimestamp > Date.now() - 10000; // Updated within last 10 seconds
    }, { timeout });
  }

  async getLastUpdateTimestamp(): Promise<number> {
    return await this.page.evaluate(() => {
      return (window as any).lastUpdateTimestamp || 0;
    });
  }

  /**
   * Widget interaction methods
   */
  async hoverEmployeeWidget(employeeId: string) {
    const widget = this.getEmployeeUtilizationWidget(employeeId);
    await widget.hover();
  }

  async clickEmployeeWidget(employeeId: string) {
    const widget = this.getEmployeeUtilizationWidget(employeeId);
    await this.clickElement(widget);
  }

  async getEmployeeTooltip(): Locator {
    return this.page.locator('[data-testid="employee-tooltip"]');
  }

  async expandProjectTimeline() {
    await this.clickElement(this.page.locator('[data-testid="expand-timeline"]'));
  }

  async collapseProjectTimeline() {
    await this.clickElement(this.page.locator('[data-testid="collapse-timeline"]'));
  }

  /**
   * Dashboard customization methods
   */
  async addWidget(widgetType: string) {
    await this.clickElement(this.page.locator('[data-testid="add-widget-button"]'));
    await this.clickElement(this.page.locator(`[data-testid="widget-type-${widgetType}"]`));
  }

  async removeWidget(widgetId: string) {
    const widget = this.page.locator(`[data-testid="widget-${widgetId}"]`);
    const removeButton = widget.locator('[data-testid="remove-widget"]');
    await this.clickElement(removeButton);
  }

  async moveWidget(fromPosition: number, toPosition: number) {
    const widget = this.page.locator(`[data-testid="dashboard-widget"]:nth-child(${fromPosition + 1})`);
    const target = this.page.locator(`[data-testid="dashboard-widget"]:nth-child(${toPosition + 1})`);
    
    await widget.dragTo(target);
  }

  async saveDashboardLayout() {
    await this.clickElement(this.page.locator('[data-testid="save-dashboard-layout"]'));
  }

  async resetDashboardLayout() {
    await this.clickElement(this.page.locator('[data-testid="reset-dashboard-layout"]'));
  }

  /**
   * Notification methods
   */
  async getNotificationBadge(): Locator {
    return this.page.locator('[data-testid="notification-badge"]');
  }

  async openNotificationsPanel() {
    await this.clickElement(this.page.locator('[data-testid="notifications-button"]'));
  }

  async getNotificationsPanel(): Locator {
    return this.page.locator('[data-testid="notifications-panel"]');
  }

  async markNotificationAsRead(notificationId: string) {
    const notification = this.page.locator(`[data-testid="notification-${notificationId}"]`);
    const markReadButton = notification.locator('[data-testid="mark-read"]');
    await this.clickElement(markReadButton);
  }

  async clearAllNotifications() {
    await this.clickElement(this.page.locator('[data-testid="clear-all-notifications"]'));
  }

  /**
   * Accessibility methods
   */
  async getKeyboardNavigation(): Locator {
    return this.page.locator('[data-testid="keyboard-navigation-helper"]');
  }

  async enableHighContrast() {
    await this.clickElement(this.page.locator('[data-testid="high-contrast-toggle"]'));
  }

  async enableScreenReaderMode() {
    await this.clickElement(this.page.locator('[data-testid="screen-reader-mode"]'));
  }

  async getAccessibilityStatus(): Promise<string> {
    const statusElement = this.page.locator('[data-testid="accessibility-status"]');
    return await statusElement.textContent() || '';
  }
}
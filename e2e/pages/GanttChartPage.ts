import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for Gantt Chart and Timeline functionality
 * Handles all interactions with project timelines, dependencies, and critical path analysis
 */
export class GanttChartPage extends BasePage {
  // Main Gantt chart selectors
  private readonly ganttContainer = '[data-testid="gantt-container"]';
  private readonly timelineHeader = '[data-testid="timeline-header"]';
  private readonly projectList = '[data-testid="project-list"]';
  private readonly timelineGrid = '[data-testid="timeline-grid"]';
  
  // Project and timeline selectors
  private readonly projectBar = '[data-testid="project-bar"]';
  private readonly projectResizeHandle = '[data-testid="resize-handle"]';
  private readonly dependencyArrow = '[data-testid="dependency-arrow"]';
  
  // Control and navigation selectors
  private readonly zoomControls = '[data-testid="zoom-controls"]';
  private readonly todayButton = '[data-testid="today-button"]';
  private readonly navigationControls = '[data-testid="navigation-controls"]';
  
  // Dialog and modal selectors
  private readonly newProjectDialog = '[data-testid="new-project-dialog"]';
  private readonly projectTimelineDialog = '[data-testid="project-timeline-dialog"]';
  private readonly dependencyDialog = '[data-testid="dependency-dialog"]';

  constructor(page: Page, baseUrl?: string) {
    super(page, baseUrl);
  }

  /**
   * Navigation methods
   */
  async navigate(path: string = '/gantt') {
    await super.navigate(path);
  }

  async waitForTimelineRender() {
    await this.waitForVisible(this.page.locator(this.ganttContainer));
    await this.page.waitForFunction(() => {
      const timeline = document.querySelector('[data-testid="timeline-grid"]');
      return timeline && timeline.children.length > 0;
    }, { timeout: 15000 });
  }

  /**
   * Gantt chart basic methods
   */
  async getGanttContainer(): Locator {
    return this.page.locator(this.ganttContainer);
  }

  async getTimelineHeader(): Locator {
    return this.page.locator(this.timelineHeader);
  }

  async getProjectList(): Locator {
    return this.page.locator(this.projectList);
  }

  async getFirstProjectInList(): Locator {
    return this.page.locator('[data-testid="project-list-item"]:first-child');
  }

  async verifyTimelineMonths(expectedMonths: string[]) {
    for (const month of expectedMonths) {
      const monthHeader = this.page.locator(`[data-testid="month-header"]:has-text("${month}")`);
      await expect(monthHeader).toBeVisible();
    }
  }

  async verifyTimelineWeeks() {
    const weekHeaders = this.page.locator('[data-testid="week-header"]');
    const count = await weekHeaders.count();
    expect(count).toBeGreaterThan(0);
  }

  /**
   * Project creation and management methods
   */
  async createSampleProject(projectData?: {
    name?: string;
    startDate?: string;
    endDate?: string;
    priority?: string;
    duration?: number;
  }): Promise<string> {
    const defaultData = {
      name: 'Sample Project',
      startDate: '2024-03-01',
      endDate: '2024-04-01',
      priority: 'Medium'
    };
    
    const data = { ...defaultData, ...projectData };
    
    // Create project via API for consistency
    return await this.page.evaluate(async (projectData) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });
      const result = await response.json();
      return result.id;
    }, data);
  }

  async getProjectBar(projectName: string): Locator {
    return this.page.locator(`[data-testid="project-bar"][data-project-name="${projectName}"]`);
  }

  async getProjectBar(projectId: string): Locator {
    return this.page.locator(`[data-testid="project-bar"][data-project-id="${projectId}"]`);
  }

  async calculateExpectedBarWidth(startDate: string, endDate: string): Promise<number> {
    return await this.page.evaluate(({ startDate, endDate }) => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const pixelsPerDay = 20; // Assuming 20px per day
      return daysDiff * pixelsPerDay;
    }, { startDate, endDate });
  }

  async getProjectDetails(projectId: string): Promise<any> {
    return await this.page.evaluate(async (id) => {
      const response = await fetch(`/api/projects/${id}`);
      return await response.json();
    }, projectId);
  }

  async editProject(projectId: string) {
    const projectBar = this.getProjectBar(projectId);
    await projectBar.dblclick();
  }

  async setProjectStartDate(date: string) {
    const input = this.page.locator('[data-testid="project-start-date"]');
    await this.fillInput(input, date);
  }

  async setProjectEndDate(date: string) {
    const input = this.page.locator('[data-testid="project-end-date"]');
    await this.fillInput(input, date);
  }

  async saveProjectChanges() {
    await this.clickElement(this.page.locator('[data-testid="save-project"]'));
  }

  async deleteProject(projectId: string) {
    const projectBar = this.getProjectBar(projectId);
    await projectBar.click({ button: 'right' }); // Right-click for context menu
    await this.clickElement(this.page.locator('[data-testid="delete-project"]'));
    await this.clickElement(this.page.locator('[data-testid="confirm-delete"]'));
  }

  /**
   * Timeline navigation and zoom methods
   */
  async setTimelineZoom(level: string) {
    await this.clickElement(this.page.locator(`[data-testid="zoom-${level}"]`));
    await this.page.waitForTimeout(500); // Allow zoom animation
  }

  async getHorizontalScrollPosition(): Promise<number> {
    return await this.page.evaluate(() => {
      const timeline = document.querySelector('[data-testid="timeline-grid"]');
      return timeline?.scrollLeft || 0;
    });
  }

  async scrollTimelineRight() {
    const timeline = this.page.locator(this.timelineGrid);
    await timeline.evaluate(el => {
      el.scrollLeft += 300;
    });
  }

  async scrollTimelineLeft() {
    const timeline = this.page.locator(this.timelineGrid);
    await timeline.evaluate(el => {
      el.scrollLeft -= 300;
    });
  }

  async scrollTimelineToEnd() {
    const timeline = this.page.locator(this.timelineGrid);
    await timeline.evaluate(el => {
      el.scrollLeft = el.scrollWidth;
    });
  }

  async clickTodayButton() {
    await this.clickElement(this.page.locator(this.todayButton));
  }

  async verifyTodayIsVisible() {
    const todayIndicator = this.page.locator('[data-testid="today-indicator"]');
    await expect(todayIndicator).toBeVisible();
  }

  async navigateToDate(date: string) {
    await this.clickElement(this.page.locator('[data-testid="date-navigator"]'));
    const dateInput = this.page.locator('[data-testid="navigate-to-date"]');
    await this.fillInput(dateInput, date);
    await this.clickElement(this.page.locator('[data-testid="navigate-confirm"]'));
  }

  /**
   * Timeline cell methods
   */
  async getTimelineCell(date: string): Locator {
    return this.page.locator(`[data-testid="timeline-cell"][data-date="${date}"]`);
  }

  async getEmptyTimelineArea(date: string): Locator {
    return this.page.locator(`[data-testid="empty-timeline-area"][data-date="${date}"]`);
  }

  /**
   * Project resize and drag methods
   */
  async getProjectResizeHandle(projectId: string, side: 'left' | 'right'): Locator {
    return this.page.locator(`[data-testid="resize-handle-${side}"][data-project-id="${projectId}"]`);
  }

  async getDragFeedback(): Locator {
    return this.page.locator('[data-testid="drag-feedback"]');
  }

  async getResizeFeedback(): Locator {
    return this.page.locator('[data-testid="resize-feedback"]');
  }

  async getProjectEndDateDisplay(): Locator {
    return this.page.locator('[data-testid="project-end-date-display"]');
  }

  /**
   * New project creation methods
   */
  async getNewProjectDialog(): Locator {
    return this.page.locator(this.newProjectDialog);
  }

  async fillNewProjectForm(projectData: {
    name: string;
    description?: string;
    priority?: string;
  }) {
    const nameInput = this.page.locator('[data-testid="new-project-name"]');
    await this.fillInput(nameInput, projectData.name);
    
    if (projectData.description) {
      const descInput = this.page.locator('[data-testid="new-project-description"]');
      await this.fillInput(descInput, projectData.description);
    }
    
    if (projectData.priority) {
      const prioritySelect = this.page.locator('[data-testid="new-project-priority"]');
      await this.selectOption(prioritySelect, projectData.priority);
    }
  }

  async submitNewProject() {
    await this.clickElement(this.page.locator('[data-testid="create-project"]'));
  }

  /**
   * Project timeline dialog methods
   */
  async getProjectTimelineDialog(): Locator {
    return this.page.locator(this.projectTimelineDialog);
  }

  async setProjectStartDate(date: string) {
    const input = this.page.locator('[data-testid="timeline-start-date"]');
    await this.fillInput(input, date);
  }

  async setProjectEndDate(date: string) {
    const input = this.page.locator('[data-testid="timeline-end-date"]');
    await this.fillInput(input, date);
  }

  async setProjectPriority(priority: string) {
    const select = this.page.locator('[data-testid="timeline-priority"]');
    await this.selectOption(select, priority);
  }

  async submitProjectTimeline() {
    await this.clickElement(this.page.locator('[data-testid="submit-timeline"]'));
  }

  async getProjectInTimeline(): Locator {
    return this.page.locator('[data-testid="project-timeline-bar"]');
  }

  async verifyProjectTimelineSpan(startDate: string, endDate: string) {
    const projectBar = this.getProjectInTimeline();
    const startDateAttr = await projectBar.getAttribute('data-start-date');
    const endDateAttr = await projectBar.getAttribute('data-end-date');
    
    expect(startDateAttr).toBe(startDate);
    expect(endDateAttr).toBe(endDate);
  }

  async getProjectTimelineBar(): Locator {
    return this.page.locator('[data-testid="project-timeline-bar"]');
  }

  /**
   * Dependency management methods
   */
  async createDependency(fromProjectId: string, toProjectId: string, type: string) {
    // Right-click on source project
    const fromProject = this.getProjectBar(fromProjectId);
    await fromProject.click({ button: 'right' });
    
    // Select create dependency option
    await this.clickElement(this.page.locator('[data-testid="create-dependency"]'));
    
    // Select target project
    const targetSelect = this.page.locator('[data-testid="dependency-target"]');
    await this.selectOption(targetSelect, toProjectId);
    
    // Select dependency type
    const typeSelect = this.page.locator('[data-testid="dependency-type"]');
    await this.selectOption(typeSelect, type);
    
    // Confirm dependency creation
    await this.clickElement(this.page.locator('[data-testid="create-dependency-confirm"]'));
  }

  async getDependencyArrow(fromProjectId: string, toProjectId: string): Locator {
    return this.page.locator(`[data-testid="dependency-arrow"][data-from="${fromProjectId}"][data-to="${toProjectId}"]`);
  }

  async getDependencyTooltip(): Locator {
    return this.page.locator('[data-testid="dependency-tooltip"]');
  }

  async getDependencyWarning(): Locator {
    return this.page.locator('[data-testid="dependency-warning"]');
  }

  /**
   * Capacity mode methods
   */
  async switchToCapacityMode() {
    await this.clickElement(this.page.locator('[data-testid="capacity-mode-toggle"]'));
  }

  async getCapacityTimeline(): Locator {
    return this.page.locator('[data-testid="capacity-timeline"]');
  }

  async createProjectWithCapacityRequirement(projectData: {
    name: string;
    teamSize: number;
    startDate: string;
    endDate: string;
  }) {
    await this.page.evaluate(async (data) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          capacityRequirement: data.teamSize
        })
      });
      return await response.json();
    }, projectData);
  }

  async getCapacityUtilizationBars(): Locator {
    return this.page.locator('[data-testid="capacity-utilization-bar"]');
  }

  async getOverCapacityPeriod(): Locator {
    return this.page.locator('[data-testid="over-capacity-period"]');
  }

  async getCapacityWarningTooltip(): Locator {
    return this.page.locator('[data-testid="capacity-warning-tooltip"]');
  }

  /**
   * Critical path analysis methods
   */
  async calculateCriticalPath() {
    await this.clickElement(this.page.locator('[data-testid="calculate-critical-path"]'));
  }

  async getCriticalPathLegend(): Locator {
    return this.page.locator('[data-testid="critical-path-legend"]');
  }

  async selectProject(projectId: string) {
    const projectBar = this.getProjectBar(projectId);
    await this.clickElement(projectBar);
  }

  async extendProjectDuration(days: number) {
    const extendButton = this.page.locator('[data-testid="extend-duration"]');
    await this.clickElement(extendButton);
    
    const daysInput = this.page.locator('[data-testid="extend-days"]');
    await this.fillInput(daysInput, days.toString());
    
    await this.clickElement(this.page.locator('[data-testid="confirm-extend"]'));
  }

  async getCriticalPathImpactWarning(): Locator {
    return this.page.locator('[data-testid="critical-path-impact-warning"]');
  }

  /**
   * Slack time methods
   */
  async showSlackTime() {
    await this.clickElement(this.page.locator('[data-testid="show-slack-time"]'));
  }

  async getSlackTimeIndicator(projectId: string): Locator {
    return this.page.locator(`[data-testid="slack-indicator"][data-project-id="${projectId}"]`);
  }

  async getSlackTooltip(): Locator {
    return this.page.locator('[data-testid="slack-tooltip"]');
  }

  /**
   * Resource integration methods
   */
  async getProjectResourceIndicator(projectId: string): Locator {
    return this.page.locator(`[data-testid="resource-indicator"][data-project-id="${projectId}"]`);
  }

  async getResourceTooltip(): Locator {
    return this.page.locator('[data-testid="resource-tooltip"]');
  }

  async getProjectConflictIndicator(projectId: string): Locator {
    return this.page.locator(`[data-testid="conflict-indicator"][data-project-id="${projectId}"]`);
  }

  async getConflictPeriodHighlight(startDate: string, endDate: string): Locator {
    return this.page.locator(`[data-testid="conflict-period"][data-start="${startDate}"][data-end="${endDate}"]`);
  }

  async getConflictResolutionDialog(): Locator {
    return this.page.locator('[data-testid="conflict-resolution-dialog"]');
  }

  /**
   * Performance methods
   */
  async getVisibleProjectBars(): Promise<Locator[]> {
    const bars = this.page.locator('[data-testid="project-bar"]');
    const count = await bars.count();
    const results = [];
    
    for (let i = 0; i < count; i++) {
      const bar = bars.nth(i);
      if (await bar.isVisible()) {
        results.push(bar);
      }
    }
    
    return results;
  }

  /**
   * Data access methods
   */
  async getAvailableProjects(): Promise<Array<{id: string, name: string}>> {
    return await this.page.evaluate(async () => {
      const response = await fetch('/api/projects');
      return await response.json();
    });
  }

  /**
   * Utility methods
   */
  async waitForAnimation() {
    await this.page.waitForTimeout(500);
  }

  async getTooltip(): Locator {
    return this.page.locator('[data-testid="tooltip"]');
  }

  async getLoadingIndicator(): Locator {
    return this.page.locator('[data-testid="loading-indicator"]');
  }

  async waitForNoLoadingIndicators() {
    await this.page.waitForFunction(() => {
      const indicators = document.querySelectorAll('[data-testid="loading-indicator"]');
      return indicators.length === 0;
    });
  }

  /**
   * Context menu methods
   */
  async openProjectContextMenu(projectId: string) {
    const projectBar = this.getProjectBar(projectId);
    await projectBar.click({ button: 'right' });
  }

  async getContextMenu(): Locator {
    return this.page.locator('[data-testid="context-menu"]');
  }

  async getContextMenuItem(action: string): Locator {
    return this.page.locator(`[data-testid="context-menu-${action}"]`);
  }

  /**
   * Zoom and view methods
   */
  async zoomToFit() {
    await this.clickElement(this.page.locator('[data-testid="zoom-to-fit"]'));
  }

  async zoomIn() {
    await this.clickElement(this.page.locator('[data-testid="zoom-in"]'));
  }

  async zoomOut() {
    await this.clickElement(this.page.locator('[data-testid="zoom-out"]'));
  }

  async resetZoom() {
    await this.clickElement(this.page.locator('[data-testid="reset-zoom"]'));
  }

  /**
   * Export methods
   */
  async exportGanttChart(format: string) {
    await this.clickElement(this.page.locator('[data-testid="export-gantt"]'));
    await this.clickElement(this.page.locator(`[data-testid="export-format-${format}"]`));
  }

  async getExportDialog(): Locator {
    return this.page.locator('[data-testid="export-gantt-dialog"]');
  }

  /**
   * Filter methods
   */
  async filterByPriority(priority: string) {
    await this.clickElement(this.page.locator('[data-testid="filter-priority"]'));
    await this.clickElement(this.page.locator(`[data-testid="priority-${priority}"]`));
  }

  async filterByStatus(status: string) {
    await this.clickElement(this.page.locator('[data-testid="filter-status"]'));
    await this.clickElement(this.page.locator(`[data-testid="status-${status}"]`));
  }

  async clearFilters() {
    await this.clickElement(this.page.locator('[data-testid="clear-filters"]'));
  }

  async getFilterIndicator(): Locator {
    return this.page.locator('[data-testid="filter-indicator"]');
  }
}
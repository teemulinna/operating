import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for Resource Allocation functionality
 * Handles all interactions with resource allocation forms, lists, and management
 */
export class ResourceAllocationPage extends BasePage {
  // Form selectors
  private readonly allocationForm = '[data-testid="allocation-form"]';
  private readonly employeeSelect = '[data-testid="employee-select"]';
  private readonly projectSelect = '[data-testid="project-select"]';
  private readonly percentageInput = '[data-testid="allocation-percentage"]';
  private readonly startDateInput = '[data-testid="start-date"]';
  private readonly endDateInput = '[data-testid="end-date"]';
  private readonly submitButton = '[data-testid="submit-allocation"]';
  private readonly cancelButton = '[data-testid="cancel-allocation"]';
  
  // Warning selectors
  private readonly overAllocationWarning = '[data-testid="over-allocation-warning"]';
  private readonly validationError = '[data-testid="validation-error"]';
  private readonly successMessage = '[data-testid="success-message"]';
  private readonly capacityWarning = '[data-testid="capacity-warning"]';
  
  // List and calendar selectors
  private readonly allocationsList = '[data-testid="allocations-list"]';
  private readonly calendarView = '[data-testid="calendar-view"]';
  private readonly employeeList = '[data-testid="employee-list"]';
  
  constructor(page: Page, baseUrl?: string) {
    super(page, baseUrl);
  }

  /**
   * Navigation methods
   */
  async navigate(path: string = '/allocations') {
    await super.navigate(path);
  }

  async navigateToCalendarView() {
    await this.clickElement(this.getByTestId('calendar-view-tab'));
    await this.waitForVisible(this.page.locator(this.calendarView));
  }

  async navigateToAllocationsList() {
    await this.clickElement(this.getByTestId('list-view-tab'));
    await this.waitForVisible(this.page.locator(this.allocationsList));
  }

  /**
   * Form interaction methods
   */
  async openAllocationForm() {
    await this.clickElement(this.getByTestId('new-allocation-button'));
    await this.waitForVisible(this.page.locator(this.allocationForm));
  }

  async selectFirstAvailableEmployee(): Promise<string> {
    const employeeSelectElement = this.page.locator(this.employeeSelect);
    await this.clickElement(employeeSelectElement);
    
    const firstOption = this.page.locator('[data-testid="employee-option"]:first-child');
    await this.clickElement(firstOption);
    
    return await firstOption.getAttribute('data-employee-id') || '';
  }

  async selectEmployeeById(employeeId: string) {
    const employeeSelectElement = this.page.locator(this.employeeSelect);
    await this.clickElement(employeeSelectElement);
    
    const optionLocator = this.page.locator(`[data-testid="employee-option"][data-employee-id="${employeeId}"]`);
    await this.clickElement(optionLocator);
  }

  async selectEmployeeByIndex(index: number) {
    const employeeSelectElement = this.page.locator(this.employeeSelect);
    await this.clickElement(employeeSelectElement);
    
    const optionLocator = this.page.locator(`[data-testid="employee-option"]:nth-child(${index + 1})`);
    await this.clickElement(optionLocator);
  }

  async getSelectedEmployeeName(): Promise<string> {
    const selectedEmployee = this.page.locator(`${this.employeeSelect} .selected-text`);
    return await selectedEmployee.textContent() || '';
  }

  async selectFirstAvailableProject(): Promise<string> {
    const projectSelectElement = this.page.locator(this.projectSelect);
    await this.clickElement(projectSelectElement);
    
    const firstOption = this.page.locator('[data-testid="project-option"]:first-child');
    await this.clickElement(firstOption);
    
    return await firstOption.getAttribute('data-project-id') || '';
  }

  async selectSecondAvailableProject(): Promise<string> {
    const projectSelectElement = this.page.locator(this.projectSelect);
    await this.clickElement(projectSelectElement);
    
    const secondOption = this.page.locator('[data-testid="project-option"]:nth-child(2)');
    await this.clickElement(secondOption);
    
    return await secondOption.getAttribute('data-project-id') || '';
  }

  async selectProjectById(projectId: string) {
    const projectSelectElement = this.page.locator(this.projectSelect);
    await this.clickElement(projectSelectElement);
    
    const optionLocator = this.page.locator(`[data-testid="project-option"][data-project-id="${projectId}"]`);
    await this.clickElement(optionLocator);
  }

  async selectProjectByIndex(index: number) {
    const projectSelectElement = this.page.locator(this.projectSelect);
    await this.clickElement(projectSelectElement);
    
    const optionLocator = this.page.locator(`[data-testid="project-option"]:nth-child(${index + 1})`);
    await this.clickElement(optionLocator);
  }

  async setAllocationPercentage(percentage: number) {
    const percentageElement = this.page.locator(this.percentageInput);
    await this.fillInput(percentageElement, percentage.toString());
  }

  async setDateRange(startDate: string, endDate: string) {
    const startElement = this.page.locator(this.startDateInput);
    const endElement = this.page.locator(this.endDateInput);
    
    await this.fillInput(startElement, startDate);
    await this.fillInput(endElement, endDate);
  }

  async submitAllocation() {
    await this.clickElement(this.page.locator(this.submitButton));
  }

  async forceSubmitAllocation() {
    // For testing over-allocation scenarios where we need to bypass validation
    await this.page.evaluate(() => {
      const form = document.querySelector('[data-testid="allocation-form"]') as HTMLFormElement;
      if (form) {
        form.noValidate = true;
      }
    });
    await this.submitAllocation();
  }

  async cancelAllocationForm() {
    await this.clickElement(this.page.locator(this.cancelButton));
  }

  /**
   * Calendar and drag-drop methods
   */
  async getCalendarCell(date: string): Locator {
    return this.page.locator(`[data-testid="calendar-cell"][data-date="${date}"]`);
  }

  async getAllocationInCalendar(employeeId: string, projectId: string): Locator {
    return this.page.locator(`[data-testid="calendar-allocation"][data-employee-id="${employeeId}"][data-project-id="${projectId}"]`);
  }

  async getAllocationInCalendarByDate(date: string): Locator {
    return this.page.locator(`[data-testid="calendar-allocation"][data-date="${date}"]`);
  }

  async getEmployeeList(): Locator {
    return this.page.locator(this.employeeList);
  }

  async getFirstEmployeeInList(): Locator {
    return this.page.locator('[data-testid="employee-list-item"]:first-child');
  }

  async getEmployeeById(employeeId: string): Locator {
    return this.page.locator(`[data-testid="employee-list-item"][data-employee-id="${employeeId}"]`);
  }

  async getEmployeeByIndex(index: number): Locator {
    return this.page.locator(`[data-testid="employee-list-item"]:nth-child(${index + 1})`);
  }

  // Drag and drop support
  async getDragPreview(): Locator {
    return this.page.locator('[data-testid="drag-preview"]');
  }

  async getQuickAllocationDialog(): Locator {
    return this.page.locator('[data-testid="quick-allocation-dialog"]');
  }

  async setQuickAllocationPercentage(percentage: number) {
    const input = this.page.locator('[data-testid="quick-allocation-percentage"]');
    await this.fillInput(input, percentage.toString());
  }

  async setQuickAllocationProject(projectName: string) {
    const select = this.page.locator('[data-testid="quick-allocation-project"]');
    await this.selectOption(select, projectName);
  }

  async submitQuickAllocation() {
    await this.clickElement(this.page.locator('[data-testid="quick-allocation-submit"]'));
  }

  /**
   * Warning and validation methods
   */
  async getOverAllocationWarning(): Locator {
    return this.page.locator(this.overAllocationWarning);
  }

  async getValidationError(): Locator {
    return this.page.locator(this.validationError);
  }

  async getSuccessMessage(): Locator {
    return this.page.locator(this.successMessage);
  }

  async getSubmitButton(): Locator {
    return this.page.locator(this.submitButton);
  }

  async getCurrentAllocationDisplay(): Locator {
    return this.page.locator('[data-testid="current-allocation-display"]');
  }

  async getTotalAllocationDisplay(): Locator {
    return this.page.locator('[data-testid="total-allocation-display"]');
  }

  async getCapacityWarningByLevel(level: string): Locator {
    return this.page.locator(`[data-testid="capacity-warning-${level}"]`);
  }

  async getPartialOverlapWarning(): Locator {
    return this.page.locator('[data-testid="partial-overlap-warning"]');
  }

  async getComplexOverlapWarning(): Locator {
    return this.page.locator('[data-testid="complex-overlap-warning"]');
  }

  async viewDetailedCapacityBreakdown() {
    await this.clickElement(this.page.locator('[data-testid="view-capacity-breakdown"]'));
  }

  async getCapacityBreakdownModal(): Locator {
    return this.page.locator('[data-testid="capacity-breakdown-modal"]');
  }

  /**
   * List management methods
   */
  async editFirstAllocation() {
    const firstAllocation = this.page.locator('[data-testid="allocation-item"]:first-child');
    const editButton = firstAllocation.locator('[data-testid="edit-allocation"]');
    await this.clickElement(editButton);
  }

  async deleteFirstAllocation() {
    const firstAllocation = this.page.locator('[data-testid="allocation-item"]:first-child');
    const deleteButton = firstAllocation.locator('[data-testid="delete-allocation"]');
    await this.clickElement(deleteButton);
  }

  async confirmDeletion() {
    await this.clickElement(this.page.locator('[data-testid="confirm-delete"]'));
  }

  /**
   * Batch operations
   */
  async selectEmployeeForBatch(index: number) {
    const checkbox = this.page.locator(`[data-testid="employee-list-item"]:nth-child(${index + 1}) [data-testid="batch-select"]`);
    await this.clickElement(checkbox);
  }

  async getBatchSelectionIndicator(): Locator {
    return this.page.locator('[data-testid="batch-selection-indicator"]');
  }

  async getBatchDragHandle(): Locator {
    return this.page.locator('[data-testid="batch-drag-handle"]');
  }

  async getBatchAllocationDialog(): Locator {
    return this.page.locator('[data-testid="batch-allocation-dialog"]');
  }

  async setBatchAllocationPercentage(percentage: number) {
    const input = this.page.locator('[data-testid="batch-allocation-percentage"]');
    await this.fillInput(input, percentage.toString());
  }

  async setBatchAllocationProject(projectName: string) {
    const select = this.page.locator('[data-testid="batch-allocation-project"]');
    await this.selectOption(select, projectName);
  }

  async setBatchAllocationDuration(duration: string) {
    const select = this.page.locator('[data-testid="batch-allocation-duration"]');
    await this.selectOption(select, duration);
  }

  async submitBatchAllocation() {
    await this.clickElement(this.page.locator('[data-testid="batch-allocation-submit"]'));
  }

  /**
   * Conflict resolution
   */
  async getConflictDialog(): Locator {
    return this.page.locator('[data-testid="conflict-dialog"]');
  }

  async getConflictDialogOption(option: string): Locator {
    return this.page.locator(`[data-testid="conflict-option-${option}"]`);
  }

  async getInvalidDropIndicator(): Locator {
    return this.page.locator('[data-testid="invalid-drop-indicator"]');
  }

  async getInvalidDropTooltip(): Locator {
    return this.page.locator('[data-testid="invalid-drop-tooltip"]');
  }

  async getDragCapacityWarning(): Locator {
    return this.page.locator('[data-testid="drag-capacity-warning"]');
  }

  async getCapacityAwareDialog(): Locator {
    return this.page.locator('[data-testid="capacity-aware-dialog"]');
  }

  /**
   * Settings and configuration
   */
  async openCapacitySettings() {
    await this.clickElement(this.page.locator('[data-testid="capacity-settings-button"]'));
  }

  async setCapacityThreshold(type: string, value: number) {
    const input = this.page.locator(`[data-testid="threshold-${type}"]`);
    await this.fillInput(input, value.toString());
  }

  async saveCapacitySettings() {
    await this.clickElement(this.page.locator('[data-testid="save-capacity-settings"]'));
  }

  async resetCapacityThresholds() {
    await this.clickElement(this.page.locator('[data-testid="reset-thresholds"]'));
  }

  async getThresholdInput(type: string): Locator {
    return this.page.locator(`[data-testid="threshold-${type}"]`);
  }

  /**
   * Notification settings
   */
  async openNotificationSettings() {
    await this.clickElement(this.page.locator('[data-testid="notification-settings-button"]'));
  }

  async enableNotification(type: string) {
    const checkbox = this.page.locator(`[data-testid="notification-${type}"]`);
    await checkbox.check();
  }

  async disableNotification(type: string) {
    const checkbox = this.page.locator(`[data-testid="notification-${type}"]`);
    await checkbox.uncheck();
  }

  async saveNotificationSettings() {
    await this.clickElement(this.page.locator('[data-testid="save-notification-settings"]'));
  }

  /**
   * Accessibility support
   */
  async enableAccessibilityMonitoring() {
    await this.page.evaluate(() => {
      // Enable ARIA live region monitoring
      if (!(window as any).accessibilityMonitoring) {
        (window as any).accessibilityMonitoring = true;
      }
    });
  }

  async getAriaLiveRegion(): Locator {
    return this.page.locator('[aria-live="polite"], [aria-live="assertive"]');
  }

  async getKeyboardDragMode(): Locator {
    return this.page.locator('[data-testid="keyboard-drag-mode"]');
  }

  async getKeyboardDragInstructions(): Locator {
    return this.page.locator('[data-testid="keyboard-drag-instructions"]');
  }

  /**
   * Performance testing methods
   */
  async waitForAllFormElementsVisible() {
    await Promise.all([
      this.waitForVisible(this.page.locator(this.employeeSelect)),
      this.waitForVisible(this.page.locator(this.projectSelect)),
      this.waitForVisible(this.page.locator(this.percentageInput)),
      this.waitForVisible(this.page.locator(this.startDateInput)),
      this.waitForVisible(this.page.locator(this.endDateInput)),
      this.waitForVisible(this.page.locator(this.submitButton))
    ]);
  }

  async loadLargeEmployeeDataset(count: number) {
    await this.page.evaluate((count) => {
      // Simulate large dataset loading
      (window as any).simulateLargeDataset = count;
    }, count);
  }

  async waitForCapacityCalculation() {
    await this.page.waitForFunction(() => {
      const indicator = document.querySelector('[data-testid="capacity-calculation-indicator"]');
      return !indicator || !indicator.classList.contains('calculating');
    }, { timeout: 10000 });
  }

  async getCapacityCalculationIndicator(): Locator {
    return this.page.locator('[data-testid="capacity-calculation-indicator"]');
  }

  /**
   * Data access methods
   */
  async getAvailableEmployees(): Promise<Array<{id: string, name: string}>> {
    return await this.page.evaluate(async () => {
      const response = await fetch('/api/employees');
      return await response.json();
    });
  }

  async getAvailableProjects(): Promise<Array<{id: string, name: string}>> {
    return await this.page.evaluate(async () => {
      const response = await fetch('/api/projects');
      return await response.json();
    });
  }

  async createAllocationViaAPI(allocation: {
    employeeId: string;
    projectId: string;
    percentage: number;
    startDate: string;
    endDate: string;
  }): Promise<string> {
    return await this.page.evaluate(async (allocation) => {
      const response = await fetch('/api/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allocation)
      });
      const result = await response.json();
      return result.id;
    }, allocation);
  }

  async createOverAllocation(employeeId: string, totalPercentage: number) {
    const allocations = [];
    let remainingPercentage = totalPercentage;
    let allocationIndex = 0;
    
    while (remainingPercentage > 0) {
      const currentPercentage = Math.min(remainingPercentage, 60);
      
      await this.openAllocationForm();
      await this.selectEmployeeById(employeeId);
      await this.selectProjectByIndex(allocationIndex);
      await this.setAllocationPercentage(currentPercentage);
      await this.setDateRange('2024-03-01', '2024-03-31');
      
      if (remainingPercentage <= 100) {
        await this.submitAllocation();
      } else {
        await this.forceSubmitAllocation();
      }
      
      await this.waitForApiResponse('/api/allocations', 'POST');
      
      remainingPercentage -= currentPercentage;
      allocationIndex++;
    }
  }

  async getCapacityInfoMessage(): Locator {
    return this.page.locator('[data-testid="capacity-info-message"]');
  }
}
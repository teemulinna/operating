import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export interface AllocationData {
  employeeName: string;
  projectName: string;
  startDate: string; // YYYY-MM-DD format
  endDate: string; // YYYY-MM-DD format
  capacity: number; // Percentage 0-100
  role?: string;
  notes?: string;
}

/**
 * Allocation Page Object Model for managing resource allocations
 */
export class AllocationPage extends BasePage {
  // Selectors
  private readonly selectors = {
    // Navigation
    allocationsLink: '[data-testid="nav-allocations"]',
    
    // Page elements
    pageTitle: '[data-testid*="title"], h1',
    addAllocationButton: '[data-testid*="add"], button:has-text("Add"), button:has-text("Allocate")',
    
    // Allocation form
    employeeSelect: 'select[name="employeeId"], [data-testid*="employee-select"]',
    projectSelect: 'select[name="projectId"], [data-testid*="project-select"]',
    startDateInput: 'input[name="startDate"], input[type="date"]:first-of-type',
    endDateInput: 'input[name="endDate"], input[type="date"]:last-of-type',
    capacityInput: 'input[name="capacity"], [data-testid*="capacity"]',
    capacitySlider: 'input[type="range"], [data-testid*="capacity-slider"]',
    roleInput: 'input[name="role"], [data-testid*="role"]',
    notesTextarea: 'textarea[name="notes"], [data-testid*="notes"]',
    
    // Form actions
    submitButton: 'button[type="submit"], button:has-text("Save"), button:has-text("Allocate")',
    cancelButton: 'button:has-text("Cancel")',
    
    // Allocation list/grid
    allocationList: '[data-testid*="allocation-list"], .allocation-list',
    allocationCard: '[data-testid*="allocation-card"], .allocation-card',
    allocationRow: '[data-testid*="allocation-row"], tr',
    allocationGrid: '[data-testid*="allocation-grid"], .allocation-grid',
    
    // Allocation actions
    editButton: '[data-testid*="edit"], button:has-text("Edit")',
    deleteButton: '[data-testid*="delete"], button:has-text("Delete"), button:has-text("Remove")',
    viewButton: '[data-testid*="view"], button:has-text("View")',
    
    // Over-allocation warning
    overAllocationWarning: '[data-testid*="over-allocation"], .over-allocation-warning, .warning',
    capacityWarning: '[data-testid*="capacity-warning"], .capacity-warning',
    conflictAlert: '[data-testid*="conflict"], .conflict-alert',
    
    // Search and filters
    searchInput: 'input[placeholder*="Search"], [data-testid*="search"]',
    employeeFilter: 'select[data-testid*="employee-filter"]',
    projectFilter: 'select[data-testid*="project-filter"]',
    dateRangeFilter: '[data-testid*="date-range"], input[type="date"]',
    
    // Modal/Dialog
    modal: '[role="dialog"], .modal, [data-testid*="modal"]',
    modalTitle: '[data-testid*="modal-title"], .modal-title',
    confirmDeleteButton: 'button:has-text("Delete"), button:has-text("Confirm")',
    
    // Capacity indicators
    capacityBar: '[data-testid*="capacity-bar"], .capacity-bar',
    utilizationPercentage: '[data-testid*="utilization"], .utilization-percentage',
    availableCapacity: '[data-testid*="available"], .available-capacity',
    
    // Timeline/Calendar view
    timelineView: '[data-testid*="timeline"], .timeline-view',
    calendarView: '[data-testid*="calendar"], .calendar-view',
    ganttChart: '[data-testid*="gantt"], .gantt-chart',
    
    // Loading and error states
    loadingSpinner: '[data-testid*="loading"], .loading, .spinner',
    errorMessage: '[data-testid*="error"], .error-message',
    emptyState: '[data-testid*="empty"], .empty-state',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to allocations page
   */
  async navigateToAllocations(): Promise<void> {
    await this.goto('/allocations');
    await this.verifyPageTitle('Allocation');
  }

  /**
   * Click the Add Allocation button
   */
  async clickAddAllocation(): Promise<void> {
    await this.clickElement(this.selectors.addAllocationButton);
    await this.waitForElement(this.selectors.modal);
  }

  /**
   * Fill allocation form with provided data
   */
  async fillAllocationForm(data: AllocationData): Promise<void> {
    // Wait for form to be visible
    await this.waitForElement(this.selectors.employeeSelect);

    // Select employee
    const employeeOption = `option:has-text("${data.employeeName}")`;
    await this.page.locator(this.selectors.employeeSelect).selectOption({ label: data.employeeName });

    // Select project
    const projectOption = `option:has-text("${data.projectName}")`;
    await this.page.locator(this.selectors.projectSelect).selectOption({ label: data.projectName });

    // Fill dates
    await this.fillField(this.selectors.startDateInput, data.startDate);
    await this.fillField(this.selectors.endDateInput, data.endDate);

    // Set capacity - try both input and slider
    if (await this.isElementVisible(this.selectors.capacityInput)) {
      await this.fillField(this.selectors.capacityInput, data.capacity.toString());
    }
    if (await this.isElementVisible(this.selectors.capacitySlider)) {
      await this.page.locator(this.selectors.capacitySlider).fill(data.capacity.toString());
    }

    // Fill optional fields
    if (data.role) {
      await this.fillField(this.selectors.roleInput, data.role);
    }

    if (data.notes) {
      await this.fillField(this.selectors.notesTextarea, data.notes);
    }
  }

  /**
   * Submit the allocation form
   */
  async submitAllocationForm(): Promise<void> {
    await this.clickElement(this.selectors.submitButton);
    await this.waitForNetworkIdle();
    
    // Wait for modal to close
    await this.waitForElementToDisappear(this.selectors.modal);
  }

  /**
   * Cancel allocation form
   */
  async cancelAllocationForm(): Promise<void> {
    await this.clickElement(this.selectors.cancelButton);
    await this.waitForElementToDisappear(this.selectors.modal);
  }

  /**
   * Create a new allocation
   */
  async createAllocation(data: AllocationData): Promise<void> {
    await this.clickAddAllocation();
    await this.fillAllocationForm(data);
    await this.submitAllocationForm();
    await this.waitForToast('Allocation created');
  }

  /**
   * Create allocation that should trigger over-allocation warning
   */
  async createOverAllocation(data: AllocationData): Promise<void> {
    await this.clickAddAllocation();
    await this.fillAllocationForm(data);
    
    // Check for over-allocation warning before submitting
    const warningExists = await this.isElementVisible(this.selectors.overAllocationWarning);
    expect(warningExists).toBeTruthy();
    
    await this.submitAllocationForm();
  }

  /**
   * Search for allocations
   */
  async searchAllocations(searchTerm: string): Promise<void> {
    await this.fillField(this.selectors.searchInput, searchTerm, { clear: true });
    await this.waitForNetworkIdle();
  }

  /**
   * Filter allocations by employee
   */
  async filterByEmployee(employeeName: string): Promise<void> {
    await this.selectOption(this.selectors.employeeFilter, employeeName);
    await this.waitForNetworkIdle();
  }

  /**
   * Filter allocations by project
   */
  async filterByProject(projectName: string): Promise<void> {
    await this.selectOption(this.selectors.projectFilter, projectName);
    await this.waitForNetworkIdle();
  }

  /**
   * Get list of allocations
   */
  async getAllocationList(): Promise<string[]> {
    await this.waitForElement(this.selectors.allocationList);
    const allocations = await this.page.locator(this.selectors.allocationCard).all();
    const allocationDescriptions: string[] = [];

    for (const allocation of allocations) {
      const employeeElement = allocation.locator('.employee-name, [data-testid*="employee"]').first();
      const projectElement = allocation.locator('.project-name, [data-testid*="project"]').first();
      
      const employee = await employeeElement.textContent();
      const project = await projectElement.textContent();
      
      if (employee && project) {
        allocationDescriptions.push(`${employee.trim()} - ${project.trim()}`);
      }
    }

    return allocationDescriptions;
  }

  /**
   * Find allocation by employee and project
   */
  async findAllocation(employeeName: string, projectName: string): Promise<boolean> {
    const allocations = await this.getAllocationList();
    return allocations.some(desc => desc.includes(employeeName) && desc.includes(projectName));
  }

  /**
   * Edit allocation
   */
  async editAllocation(
    employeeName: string,
    projectName: string,
    newData: Partial<AllocationData>
  ): Promise<void> {
    // Find the allocation card/row
    const allocationElement = this.page.locator(
      `${this.selectors.allocationCard}:has-text("${employeeName}"):has-text("${projectName}")`
    ).first();
    await allocationElement.scrollIntoViewIfNeeded();
    
    // Click edit button
    await allocationElement.locator(this.selectors.editButton).click();
    
    // Wait for form to load
    await this.waitForElement(this.selectors.modal);
    
    // Update fields
    if (newData.capacity !== undefined) {
      if (await this.isElementVisible(this.selectors.capacityInput)) {
        await this.fillField(this.selectors.capacityInput, newData.capacity.toString(), { clear: true });
      }
      if (await this.isElementVisible(this.selectors.capacitySlider)) {
        await this.page.locator(this.selectors.capacitySlider).fill(newData.capacity.toString());
      }
    }
    
    if (newData.startDate) {
      await this.fillField(this.selectors.startDateInput, newData.startDate, { clear: true });
    }
    
    if (newData.endDate) {
      await this.fillField(this.selectors.endDateInput, newData.endDate, { clear: true });
    }
    
    if (newData.role) {
      await this.fillField(this.selectors.roleInput, newData.role, { clear: true });
    }
    
    await this.submitAllocationForm();
    await this.waitForToast('Allocation updated');
  }

  /**
   * Delete allocation
   */
  async deleteAllocation(employeeName: string, projectName: string): Promise<void> {
    // Find the allocation card/row
    const allocationElement = this.page.locator(
      `${this.selectors.allocationCard}:has-text("${employeeName}"):has-text("${projectName}")`
    ).first();
    await allocationElement.scrollIntoViewIfNeeded();
    
    // Click delete button
    await allocationElement.locator(this.selectors.deleteButton).click();
    
    // Wait for confirmation dialog
    await this.waitForElement(this.selectors.modal);
    
    // Confirm deletion
    await this.clickElement(this.selectors.confirmDeleteButton);
    await this.waitForNetworkIdle();
    await this.waitForToast('Allocation removed');
    
    // Wait for modal to close
    await this.waitForElementToDisappear(this.selectors.modal);
  }

  /**
   * Verify allocation exists
   */
  async verifyAllocationExists(employeeName: string, projectName: string): Promise<void> {
    const exists = await this.findAllocation(employeeName, projectName);
    expect(exists).toBeTruthy();
  }

  /**
   * Verify allocation does not exist
   */
  async verifyAllocationNotExists(employeeName: string, projectName: string): Promise<void> {
    const exists = await this.findAllocation(employeeName, projectName);
    expect(exists).toBeFalsy();
  }

  /**
   * Verify over-allocation warning is displayed
   */
  async verifyOverAllocationWarning(): Promise<void> {
    const warningExists = await this.isElementVisible(this.selectors.overAllocationWarning);
    expect(warningExists).toBeTruthy();
    
    // Verify warning message
    const warningText = await this.getElementText(this.selectors.overAllocationWarning);
    expect(warningText.toLowerCase()).toContain('over');
  }

  /**
   * Verify capacity utilization for an employee
   */
  async verifyEmployeeUtilization(employeeName: string, expectedPercentage: number): Promise<void> {
    // Look for utilization indicator for the specific employee
    const employeeSection = this.page.locator(`[data-testid*="employee"]:has-text("${employeeName}")`).first();
    const utilizationElement = employeeSection.locator(this.selectors.utilizationPercentage).first();
    
    const utilizationText = await utilizationElement.textContent();
    expect(utilizationText).toContain(`${expectedPercentage}%`);
  }

  /**
   * Get employee current capacity
   */
  async getEmployeeCapacity(employeeName: string): Promise<number> {
    const employeeSection = this.page.locator(`[data-testid*="employee"]:has-text("${employeeName}")`).first();
    const capacityElement = employeeSection.locator(this.selectors.utilizationPercentage).first();
    
    const capacityText = await capacityElement.textContent();
    const match = capacityText?.match(/(\d+)%/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Verify date overlap validation
   */
  async verifyDateOverlapWarning(data: AllocationData): Promise<void> {
    await this.fillAllocationForm(data);
    
    // Look for overlap warning
    const conflictExists = await this.isElementVisible(this.selectors.conflictAlert);
    expect(conflictExists).toBeTruthy();
  }

  /**
   * Switch to timeline view
   */
  async switchToTimelineView(): Promise<void> {
    if (await this.isElementVisible(this.selectors.timelineView)) {
      await this.clickElement(this.selectors.timelineView);
      await this.waitForNetworkIdle();
    }
  }

  /**
   * Switch to calendar view
   */
  async switchToCalendarView(): Promise<void> {
    if (await this.isElementVisible(this.selectors.calendarView)) {
      await this.clickElement(this.selectors.calendarView);
      await this.waitForNetworkIdle();
    }
  }

  /**
   * Get allocation count
   */
  async getAllocationCount(): Promise<number> {
    await this.waitForElement(this.selectors.allocationList);
    const allocations = await this.page.locator(this.selectors.allocationCard).count();
    return allocations;
  }

  /**
   * Wait for allocations to load
   */
  async waitForAllocationsToLoad(): Promise<void> {
    await this.waitForElementToDisappear(this.selectors.loadingSpinner);
    await this.waitForNetworkIdle();
  }

  /**
   * Verify empty state
   */
  async verifyEmptyState(): Promise<void> {
    const isEmpty = await this.isElementVisible(this.selectors.emptyState);
    expect(isEmpty).toBeTruthy();
  }

  /**
   * Format date for input (YYYY-MM-DD)
   */
  formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get today's date formatted for input
   */
  getTodayFormatted(): string {
    return this.formatDateForInput(new Date());
  }

  /**
   * Get future date formatted for input
   */
  getFutureDateFormatted(daysAhead: number = 30): string {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    return this.formatDateForInput(futureDate);
  }
}
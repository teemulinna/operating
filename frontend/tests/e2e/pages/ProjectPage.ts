import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export interface ProjectData {
  name: string;
  description?: string;
  startDate: string; // YYYY-MM-DD format
  endDate: string; // YYYY-MM-DD format
  status?: 'Planning' | 'Active' | 'On Hold' | 'Completed';
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  budget?: string;
  client?: string;
}

/**
 * Project Page Object Model for managing project operations
 */
export class ProjectPage extends BasePage {
  // Selectors
  private readonly selectors = {
    // Navigation
    projectsLink: '[data-testid="nav-projects"]',
    
    // Page elements
    pageTitle: '[data-testid*="title"], h1',
    addProjectButton: '[data-testid*="add"], button:has-text("Add"), button:has-text("Create")',
    
    // Project form
    nameInput: 'input[name="name"], [data-testid*="name"]',
    descriptionTextarea: 'textarea[name="description"], [data-testid*="description"]',
    startDateInput: 'input[name="startDate"], input[type="date"]:first-of-type',
    endDateInput: 'input[name="endDate"], input[type="date"]:last-of-type',
    statusSelect: 'select[name="status"], [data-testid*="status"]',
    prioritySelect: 'select[name="priority"], [data-testid*="priority"]',
    budgetInput: 'input[name="budget"], [data-testid*="budget"]',
    clientInput: 'input[name="client"], [data-testid*="client"]',
    
    // Form actions
    submitButton: 'button[type="submit"], button:has-text("Save"), button:has-text("Create")',
    cancelButton: 'button:has-text("Cancel")',
    
    // Project list
    projectList: '[data-testid*="project-list"], .project-list',
    projectCard: '[data-testid*="project-card"], .project-card',
    projectRow: '[data-testid*="project-row"], tr',
    
    // Project actions
    editButton: '[data-testid*="edit"], button:has-text("Edit")',
    deleteButton: '[data-testid*="delete"], button:has-text("Delete")',
    viewButton: '[data-testid*="view"], button:has-text("View")',
    
    // Search and filters
    searchInput: 'input[placeholder*="Search"], [data-testid*="search"]',
    statusFilter: 'select[data-testid*="status-filter"]',
    priorityFilter: 'select[data-testid*="priority-filter"]',
    
    // Modal/Dialog
    modal: '[role="dialog"], .modal, [data-testid*="modal"]',
    modalTitle: '[data-testid*="modal-title"], .modal-title',
    confirmDeleteButton: 'button:has-text("Delete"), button:has-text("Confirm")',
    
    // Date validation
    dateError: '.date-error, [data-testid*="date-error"]',
    formError: '.form-error, [data-testid*="form-error"]',
    
    // Loading and error states
    loadingSpinner: '[data-testid*="loading"], .loading, .spinner',
    errorMessage: '[data-testid*="error"], .error-message',
    emptyState: '[data-testid*="empty"], .empty-state',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to projects page
   */
  async navigateToProjects(): Promise<void> {
    await this.goto('/projects');
    await this.verifyPageTitle('Project');
  }

  /**
   * Click the Add Project button
   */
  async clickAddProject(): Promise<void> {
    await this.clickElement(this.selectors.addProjectButton);
    await this.waitForElement(this.selectors.modal);
  }

  /**
   * Fill project form with provided data
   */
  async fillProjectForm(data: ProjectData): Promise<void> {
    // Wait for form to be visible
    await this.waitForElement(this.selectors.nameInput);

    // Fill required fields
    await this.fillField(this.selectors.nameInput, data.name);
    await this.fillField(this.selectors.startDateInput, data.startDate);
    await this.fillField(this.selectors.endDateInput, data.endDate);

    // Fill optional fields
    if (data.description) {
      await this.fillField(this.selectors.descriptionTextarea, data.description);
    }

    if (data.status) {
      await this.selectOption(this.selectors.statusSelect, data.status);
    }

    if (data.priority) {
      await this.selectOption(this.selectors.prioritySelect, data.priority);
    }

    if (data.budget) {
      await this.fillField(this.selectors.budgetInput, data.budget);
    }

    if (data.client) {
      await this.fillField(this.selectors.clientInput, data.client);
    }
  }

  /**
   * Submit the project form
   */
  async submitProjectForm(): Promise<void> {
    await this.clickElement(this.selectors.submitButton);
    await this.waitForNetworkIdle();
    
    // Wait for modal to close
    await this.waitForElementToDisappear(this.selectors.modal);
  }

  /**
   * Cancel project form
   */
  async cancelProjectForm(): Promise<void> {
    await this.clickElement(this.selectors.cancelButton);
    await this.waitForElementToDisappear(this.selectors.modal);
  }

  /**
   * Create a new project
   */
  async createProject(data: ProjectData): Promise<void> {
    await this.clickAddProject();
    await this.fillProjectForm(data);
    await this.submitProjectForm();
    await this.waitForToast('Project created');
  }

  /**
   * Search for projects
   */
  async searchProjects(searchTerm: string): Promise<void> {
    await this.fillField(this.selectors.searchInput, searchTerm, { clear: true });
    await this.waitForNetworkIdle();
  }

  /**
   * Filter projects by status
   */
  async filterByStatus(status: string): Promise<void> {
    await this.selectOption(this.selectors.statusFilter, status);
    await this.waitForNetworkIdle();
  }

  /**
   * Filter projects by priority
   */
  async filterByPriority(priority: string): Promise<void> {
    await this.selectOption(this.selectors.priorityFilter, priority);
    await this.waitForNetworkIdle();
  }

  /**
   * Get list of projects
   */
  async getProjectList(): Promise<string[]> {
    await this.waitForElement(this.selectors.projectList);
    const projects = await this.page.locator(this.selectors.projectCard).all();
    const projectNames: string[] = [];

    for (const project of projects) {
      const nameElement = project.locator('h3, .project-name, [data-testid*="name"]').first();
      const name = await nameElement.textContent();
      if (name) {
        projectNames.push(name.trim());
      }
    }

    return projectNames;
  }

  /**
   * Find project by name
   */
  async findProjectByName(projectName: string): Promise<boolean> {
    const projects = await this.getProjectList();
    return projects.some(name => name.includes(projectName));
  }

  /**
   * Edit project by name
   */
  async editProjectByName(projectName: string, newData: Partial<ProjectData>): Promise<void> {
    // Find the project card/row containing the name
    const projectElement = this.page.locator(`${this.selectors.projectCard}:has-text("${projectName}")`).first();
    await projectElement.scrollIntoViewIfNeeded();
    
    // Click edit button within that project element
    await projectElement.locator(this.selectors.editButton).click();
    
    // Wait for form to load
    await this.waitForElement(this.selectors.modal);
    
    // Update fields
    if (newData.name) {
      await this.fillField(this.selectors.nameInput, newData.name, { clear: true });
    }
    if (newData.description) {
      await this.fillField(this.selectors.descriptionTextarea, newData.description, { clear: true });
    }
    if (newData.startDate) {
      await this.fillField(this.selectors.startDateInput, newData.startDate, { clear: true });
    }
    if (newData.endDate) {
      await this.fillField(this.selectors.endDateInput, newData.endDate, { clear: true });
    }
    if (newData.status) {
      await this.selectOption(this.selectors.statusSelect, newData.status);
    }
    if (newData.priority) {
      await this.selectOption(this.selectors.prioritySelect, newData.priority);
    }
    
    await this.submitProjectForm();
    await this.waitForToast('Project updated');
  }

  /**
   * Delete project by name
   */
  async deleteProjectByName(projectName: string): Promise<void> {
    // Find the project card/row containing the name
    const projectElement = this.page.locator(`${this.selectors.projectCard}:has-text("${projectName}")`).first();
    await projectElement.scrollIntoViewIfNeeded();
    
    // Click delete button
    await projectElement.locator(this.selectors.deleteButton).click();
    
    // Wait for confirmation dialog
    await this.waitForElement(this.selectors.modal);
    
    // Confirm deletion
    await this.clickElement(this.selectors.confirmDeleteButton);
    await this.waitForNetworkIdle();
    await this.waitForToast('Project deleted');
    
    // Wait for modal to close
    await this.waitForElementToDisappear(this.selectors.modal);
  }

  /**
   * Verify project exists in list
   */
  async verifyProjectExists(projectName: string): Promise<void> {
    const exists = await this.findProjectByName(projectName);
    expect(exists).toBeTruthy();
  }

  /**
   * Verify project does not exist in list
   */
  async verifyProjectNotExists(projectName: string): Promise<void> {
    const exists = await this.findProjectByName(projectName);
    expect(exists).toBeFalsy();
  }

  /**
   * Verify date validation - end date after start date
   */
  async verifyDateValidation(startDate: string, endDate: string): Promise<void> {
    await this.fillField(this.selectors.startDateInput, startDate);
    await this.fillField(this.selectors.endDateInput, endDate);
    await this.clickElement(this.selectors.submitButton);
    
    // Check for date validation error
    const errorElement = this.page.locator(this.selectors.dateError).first();
    await expect(errorElement).toBeVisible();
  }

  /**
   * Verify required field validation
   */
  async verifyRequiredFieldValidation(field: keyof ProjectData, errorMessage: string): Promise<void> {
    let selector = '';
    switch (field) {
      case 'name':
        selector = this.selectors.nameInput;
        break;
      case 'startDate':
        selector = this.selectors.startDateInput;
        break;
      case 'endDate':
        selector = this.selectors.endDateInput;
        break;
      default:
        throw new Error(`Unknown field: ${field}`);
    }

    // Try to submit form without filling required field
    await this.clickElement(this.selectors.submitButton);
    
    // Check for validation error
    const errorElement = this.page.locator(`${selector} + .error, .field-error, [data-testid*="error"]`).first();
    await expect(errorElement).toContainText(errorMessage);
  }

  /**
   * Get project count
   */
  async getProjectCount(): Promise<number> {
    await this.waitForElement(this.selectors.projectList);
    const projects = await this.page.locator(this.selectors.projectCard).count();
    return projects;
  }

  /**
   * Verify empty state
   */
  async verifyEmptyState(): Promise<void> {
    const isEmpty = await this.isElementVisible(this.selectors.emptyState);
    expect(isEmpty).toBeTruthy();
  }

  /**
   * Wait for projects to load
   */
  async waitForProjectsToLoad(): Promise<void> {
    await this.waitForElementToDisappear(this.selectors.loadingSpinner);
    await this.waitForNetworkIdle();
  }

  /**
   * Verify project details in card/row
   */
  async verifyProjectDetails(projectName: string, expectedData: Partial<ProjectData>): Promise<void> {
    const projectElement = this.page.locator(`${this.selectors.projectCard}:has-text("${projectName}")`).first();
    
    if (expectedData.status) {
      await expect(projectElement).toContainText(expectedData.status);
    }
    
    if (expectedData.priority) {
      await expect(projectElement).toContainText(expectedData.priority);
    }
    
    if (expectedData.client) {
      await expect(projectElement).toContainText(expectedData.client);
    }
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
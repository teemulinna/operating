import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export interface EmployeeData {
  firstName: string;
  lastName: string;
  email: string;
  department?: string;
  role?: string;
  capacity?: string;
  skills?: string[];
}

/**
 * Employee Page Object Model for managing employee operations
 */
export class EmployeePage extends BasePage {
  // Selectors
  private readonly selectors = {
    // Navigation
    employeesLink: '[data-testid="nav-employees"]',
    
    // Page elements
    pageTitle: '[data-testid*="title"], h1',
    addEmployeeButton: '[data-testid*="add"], button:has-text("Add")',
    
    // Employee form
    firstNameInput: 'input[name="firstName"], [data-testid*="first-name"]',
    lastNameInput: 'input[name="lastName"], [data-testid*="last-name"]',
    emailInput: 'input[name="email"], [data-testid*="email"]',
    departmentSelect: 'select[name="department"], [data-testid*="department"]',
    roleInput: 'input[name="role"], [data-testid*="role"]',
    capacityInput: 'input[name="capacity"], [data-testid*="capacity"]',
    skillsInput: 'input[name="skills"], [data-testid*="skills"]',
    
    // Form actions
    submitButton: 'button[type="submit"], button:has-text("Save")',
    cancelButton: 'button:has-text("Cancel")',
    
    // Employee list
    employeeList: '[data-testid*="employee-list"], .employee-list',
    employeeCard: '[data-testid*="employee-card"], .employee-card',
    employeeRow: '[data-testid*="employee-row"], tr',
    
    // Employee actions
    editButton: '[data-testid*="edit"], button:has-text("Edit")',
    deleteButton: '[data-testid*="delete"], button:has-text("Delete")',
    viewButton: '[data-testid*="view"], button:has-text("View")',
    
    // Search and filters
    searchInput: 'input[placeholder*="Search"], [data-testid*="search"]',
    departmentFilter: 'select[data-testid*="department-filter"]',
    roleFilter: 'select[data-testid*="role-filter"]',
    
    // Modal/Dialog
    modal: '[role="dialog"], .modal, [data-testid*="modal"]',
    modalTitle: '[data-testid*="modal-title"], .modal-title',
    confirmDeleteButton: 'button:has-text("Delete"), button:has-text("Confirm")',
    
    // Loading and error states
    loadingSpinner: '[data-testid*="loading"], .loading, .spinner',
    errorMessage: '[data-testid*="error"], .error-message',
    emptyState: '[data-testid*="empty"], .empty-state',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to employees page
   */
  async navigateToEmployees(): Promise<void> {
    await this.goto('/employees');
    await this.verifyPageTitle('Employee');
  }

  /**
   * Click the Add Employee button
   */
  async clickAddEmployee(): Promise<void> {
    await this.clickElement(this.selectors.addEmployeeButton);
    await this.waitForElement(this.selectors.modal);
  }

  /**
   * Fill employee form with provided data
   */
  async fillEmployeeForm(data: EmployeeData): Promise<void> {
    // Wait for form to be visible
    await this.waitForElement(this.selectors.firstNameInput);

    // Fill required fields
    await this.fillField(this.selectors.firstNameInput, data.firstName);
    await this.fillField(this.selectors.lastNameInput, data.lastName);
    await this.fillField(this.selectors.emailInput, data.email);

    // Fill optional fields
    if (data.department) {
      await this.selectOption(this.selectors.departmentSelect, data.department);
    }

    if (data.role) {
      await this.fillField(this.selectors.roleInput, data.role);
    }

    if (data.capacity) {
      await this.fillField(this.selectors.capacityInput, data.capacity);
    }

    if (data.skills && data.skills.length > 0) {
      await this.fillField(this.selectors.skillsInput, data.skills.join(', '));
    }
  }

  /**
   * Submit the employee form
   */
  async submitEmployeeForm(): Promise<void> {
    await this.clickElement(this.selectors.submitButton);
    await this.waitForNetworkIdle();
    
    // Wait for modal to close
    await this.waitForElementToDisappear(this.selectors.modal);
  }

  /**
   * Cancel employee form
   */
  async cancelEmployeeForm(): Promise<void> {
    await this.clickElement(this.selectors.cancelButton);
    await this.waitForElementToDisappear(this.selectors.modal);
  }

  /**
   * Create a new employee
   */
  async createEmployee(data: EmployeeData): Promise<void> {
    await this.clickAddEmployee();
    await this.fillEmployeeForm(data);
    await this.submitEmployeeForm();
    await this.waitForToast('Employee created');
  }

  /**
   * Search for employees
   */
  async searchEmployees(searchTerm: string): Promise<void> {
    await this.fillField(this.selectors.searchInput, searchTerm, { clear: true });
    await this.waitForNetworkIdle();
  }

  /**
   * Filter employees by department
   */
  async filterByDepartment(department: string): Promise<void> {
    await this.selectOption(this.selectors.departmentFilter, department);
    await this.waitForNetworkIdle();
  }

  /**
   * Get list of employees
   */
  async getEmployeeList(): Promise<string[]> {
    await this.waitForElement(this.selectors.employeeList);
    const employees = await this.page.locator(this.selectors.employeeCard).all();
    const employeeNames: string[] = [];

    for (const employee of employees) {
      const nameElement = employee.locator('h3, .employee-name, [data-testid*="name"]').first();
      const name = await nameElement.textContent();
      if (name) {
        employeeNames.push(name.trim());
      }
    }

    return employeeNames;
  }

  /**
   * Find employee by name
   */
  async findEmployeeByName(fullName: string): Promise<boolean> {
    const employees = await this.getEmployeeList();
    return employees.some(name => name.includes(fullName));
  }

  /**
   * Edit employee by name
   */
  async editEmployeeByName(fullName: string, newData: Partial<EmployeeData>): Promise<void> {
    // Find the employee card/row containing the name
    const employeeElement = this.page.locator(`${this.selectors.employeeCard}:has-text("${fullName}")`).first();
    await employeeElement.scrollIntoViewIfNeeded();
    
    // Click edit button within that employee element
    await employeeElement.locator(this.selectors.editButton).click();
    
    // Wait for form to load
    await this.waitForElement(this.selectors.modal);
    
    // Update fields
    if (newData.firstName) {
      await this.fillField(this.selectors.firstNameInput, newData.firstName, { clear: true });
    }
    if (newData.lastName) {
      await this.fillField(this.selectors.lastNameInput, newData.lastName, { clear: true });
    }
    if (newData.email) {
      await this.fillField(this.selectors.emailInput, newData.email, { clear: true });
    }
    if (newData.department) {
      await this.selectOption(this.selectors.departmentSelect, newData.department);
    }
    if (newData.role) {
      await this.fillField(this.selectors.roleInput, newData.role, { clear: true });
    }
    
    await this.submitEmployeeForm();
    await this.waitForToast('Employee updated');
  }

  /**
   * Delete employee by name
   */
  async deleteEmployeeByName(fullName: string): Promise<void> {
    // Find the employee card/row containing the name
    const employeeElement = this.page.locator(`${this.selectors.employeeCard}:has-text("${fullName}")`).first();
    await employeeElement.scrollIntoViewIfNeeded();
    
    // Click delete button
    await employeeElement.locator(this.selectors.deleteButton).click();
    
    // Wait for confirmation dialog
    await this.waitForElement(this.selectors.modal);
    
    // Confirm deletion
    await this.clickElement(this.selectors.confirmDeleteButton);
    await this.waitForNetworkIdle();
    await this.waitForToast('Employee deleted');
    
    // Wait for modal to close
    await this.waitForElementToDisappear(this.selectors.modal);
  }

  /**
   * Verify employee exists in list
   */
  async verifyEmployeeExists(fullName: string): Promise<void> {
    const exists = await this.findEmployeeByName(fullName);
    expect(exists).toBeTruthy();
  }

  /**
   * Verify employee does not exist in list
   */
  async verifyEmployeeNotExists(fullName: string): Promise<void> {
    const exists = await this.findEmployeeByName(fullName);
    expect(exists).toBeFalsy();
  }

  /**
   * Verify employee form validation
   */
  async verifyFormValidation(field: keyof EmployeeData, errorMessage: string): Promise<void> {
    let selector = '';
    switch (field) {
      case 'firstName':
        selector = this.selectors.firstNameInput;
        break;
      case 'lastName':
        selector = this.selectors.lastNameInput;
        break;
      case 'email':
        selector = this.selectors.emailInput;
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
   * Get employee count
   */
  async getEmployeeCount(): Promise<number> {
    await this.waitForElement(this.selectors.employeeList);
    const employees = await this.page.locator(this.selectors.employeeCard).count();
    return employees;
  }

  /**
   * Verify empty state
   */
  async verifyEmptyState(): Promise<void> {
    const isEmpty = await this.isElementVisible(this.selectors.emptyState);
    expect(isEmpty).toBeTruthy();
  }

  /**
   * Wait for employees to load
   */
  async waitForEmployeesToLoad(): Promise<void> {
    await this.waitForElementToDisappear(this.selectors.loadingSpinner);
    await this.waitForNetworkIdle();
  }
}
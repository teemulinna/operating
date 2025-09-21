import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { selectors, testUrls } from '../fixtures/testData';

/**
 * Page Object Model for Employees page
 * Handles all interactions with the employees management interface
 */
export class EmployeesPage extends BasePage {
  // Page elements
  readonly title: Locator;
  readonly addButton: Locator;
  readonly searchInput: Locator;
  readonly employeeList: Locator;
  
  constructor(page: Page) {
    super(page);
    
    // Initialize locators
    this.title = this.getByTestId('employees-title');
    this.addButton = this.getByTestId('add-employee-button');
    this.searchInput = this.getByTestId('employee-search');
    this.employeeList = this.getByTestId('employee-list');
  }

  /**
   * Navigate to employees page
   */
  async goto() {
    await this.navigate(testUrls.employees);
    await this.waitForPageLoad();
  }

  /**
   * Wait for employees page to be fully loaded
   */
  async waitForEmployeesLoaded() {
    await this.waitForVisible(this.title);
    await this.waitForVisible(this.employeeList);
  }

  /**
   * Click the Add Employee button
   */
  async clickAddEmployee() {
    await this.clickElement(this.addButton);
  }

  /**
   * Search for employees
   * @param searchTerm - Term to search for
   */
  async searchEmployees(searchTerm: string) {
    await this.fillInput(this.searchInput, searchTerm);
    await this.page.waitForTimeout(500); // Wait for search debounce
  }

  /**
   * Get employee card by index
   * @param index - Index of the employee card (0-based)
   */
  getEmployeeCard(index: number): Locator {
    return this.page.locator(`[data-testid^="employee-card-"]`).nth(index);
  }

  /**
   * Get employee card by employee ID
   * @param employeeId - ID of the employee
   */
  getEmployeeCardById(employeeId: string): Locator {
    return this.getByTestId(`employee-card-${employeeId}`);
  }

  /**
   * Click edit button for specific employee
   * @param employeeId - ID of the employee to edit
   */
  async editEmployee(employeeId: string) {
    const editButton = this.getByTestId(`edit-employee-${employeeId}`);
    await this.clickElement(editButton);
  }

  /**
   * Click delete button for specific employee
   * @param employeeId - ID of the employee to delete
   */
  async deleteEmployee(employeeId: string) {
    const deleteButton = this.getByTestId(`delete-employee-${employeeId}`);
    await this.clickElement(deleteButton);
  }

  /**
   * Get all visible employee cards
   */
  getAllEmployeeCards(): Locator {
    return this.page.locator('[data-testid^="employee-card-"]');
  }

  /**
   * Wait for employee cards to be loaded
   */
  async waitForEmployeeCards() {
    await this.waitForVisible(this.getAllEmployeeCards().first());
  }

  /**
   * Check if employee exists in the list
   * @param employeeName - Full name or email of the employee
   */
  async employeeExists(employeeName: string): Promise<boolean> {
    const employeeCards = this.getAllEmployeeCards();
    const count = await employeeCards.count();
    
    for (let i = 0; i < count; i++) {
      const card = employeeCards.nth(i);
      const text = await card.textContent();
      if (text && text.includes(employeeName)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get employee count
   */
  async getEmployeeCount(): Promise<number> {
    return await this.getAllEmployeeCards().count();
  }
}
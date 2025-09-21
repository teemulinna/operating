import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { selectors, testUrls } from '../fixtures/testData';

/**
 * Page Object Model for Reports page
 * Handles all interactions with the reports and analytics interface
 */
export class ReportsPage extends BasePage {
  // Page elements
  readonly title: Locator;
  readonly exportCsvButton: Locator;
  readonly reportsList: Locator;
  readonly generateButton: Locator;
  
  constructor(page: Page) {
    super(page);
    
    // Initialize locators
    this.title = this.getByTestId('reports-title');
    this.exportCsvButton = this.getByTestId('reports-export-csv-btn');
    this.reportsList = this.getByTestId('reports-list');
    this.generateButton = this.getByTestId('generate-report');
  }

  /**
   * Navigate to reports page
   */
  async goto() {
    await this.navigate(testUrls.reports);
    await this.waitForPageLoad();
  }

  /**
   * Wait for reports page to be fully loaded
   */
  async waitForReportsLoaded() {
    await this.waitForVisible(this.title);
  }

  /**
   * Click the CSV export button
   */
  async clickExportCsv() {
    await this.clickElement(this.exportCsvButton);
  }

  /**
   * Generate a new report
   */
  async generateReport() {
    await this.clickElement(this.generateButton);
  }

  /**
   * Check if CSV export button is visible
   */
  async isCsvExportVisible(): Promise<boolean> {
    return await this.isVisible(this.exportCsvButton);
  }

  /**
   * Get all available reports
   */
  getAllReports(): Locator {
    return this.reportsList.locator('[data-testid^="report-item-"]');
  }

  /**
   * Get report by index
   * @param index - Index of the report (0-based)
   */
  getReport(index: number): Locator {
    return this.getAllReports().nth(index);
  }

  /**
   * Get report count
   */
  async getReportCount(): Promise<number> {
    return await this.getAllReports().count();
  }
}
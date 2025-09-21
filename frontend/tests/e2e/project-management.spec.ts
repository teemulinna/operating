import { test, expect } from '@playwright/test';
import { TestDataFactory, TestDatabaseUtils } from '../fixtures/testDataFactory';

const API_BASE_URL = 'http://localhost:3001';

test.describe('Project Management Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for API to be available
    await TestDatabaseUtils.waitForAPI(API_BASE_URL);
    
    // Clean database before each test
    await TestDatabaseUtils.cleanDatabase(API_BASE_URL);
    
    // Navigate to projects page
    await page.goto('/projects');
    
    // Wait for page to load
    await expect(page.getByTestId('projects-page')).toBeVisible({ timeout: 10000 });
  });

  test.afterEach(async () => {
    // Clean up after each test
    await TestDatabaseUtils.cleanDatabase(API_BASE_URL);
  });

  test('should display project management page with correct elements', async ({ page }) => {
    // Check page title
    await expect(page.getByTestId('projects-page')).toBeVisible();
    await expect(page.getByText('Project Management')).toBeVisible();
    
    // Check add project button
    await expect(page.getByTestId('add-project-button')).toBeVisible();
    
    // Check project list or empty state
    const projectList = page.getByTestId('project-list');
    await expect(projectList).toBeVisible();
  });

  test('should create a new project successfully', async ({ page }) => {
    const testProject = TestDataFactory.createProject();
    
    // Click Add Project button
    await page.getByTestId('add-project-button').click();
    
    // Fill project form
    await expect(page.getByTestId('project-form')).toBeVisible();
    
    await page.getByTestId('project-name-input').fill(testProject.name);
    await page.getByTestId('project-description-textarea').fill(testProject.description);
    await page.getByTestId('project-client-input').fill(testProject.clientName);
    await page.getByTestId('project-start-date-input').fill(testProject.startDate);
    await page.getByTestId('project-end-date-input').fill(testProject.endDate);
    await page.getByTestId('project-budget-input').fill(testProject.budget.toString());
    await page.getByTestId('project-priority-select').selectOption(testProject.priority);
    await page.getByTestId('project-status-select').selectOption(testProject.status);
    
    // Submit form
    await page.getByTestId('project-form-submit').click();
    
    // Wait for loading to complete
    await expect(page.getByTestId('loading-spinner')).toBeHidden({ timeout: 10000 });
    
    // Verify project appears in list
    await expect(page.getByText(testProject.name)).toBeVisible();
    await expect(page.getByText(testProject.clientName)).toBeVisible();
  });

  test('should validate required fields when creating project', async ({ page }) => {
    // Click Add Project button
    await page.getByTestId('add-project-button').click();
    
    // Try to submit empty form
    await page.getByTestId('project-form-submit').click();
    
    // Check validation errors
    await expect(page.getByTestId('field-error-name')).toBeVisible();
    await expect(page.getByText('Project name is required')).toBeVisible();
    
    await expect(page.getByTestId('field-error-description')).toBeVisible();
    await expect(page.getByText('Description is required')).toBeVisible();
    
    await expect(page.getByTestId('field-error-startDate')).toBeVisible();
    await expect(page.getByText('Start date is required')).toBeVisible();
  });

  test('should validate date range (end date after start date)', async ({ page }) => {
    const testProject = TestDataFactory.createProject({
      startDate: '2024-12-01',
      endDate: '2024-11-01' // End before start
    });
    
    // Click Add Project button
    await page.getByTestId('add-project-button').click();
    
    // Fill form with invalid date range
    await page.getByTestId('project-name-input').fill(testProject.name);
    await page.getByTestId('project-description-textarea').fill(testProject.description);
    await page.getByTestId('project-start-date-input').fill(testProject.startDate);
    await page.getByTestId('project-end-date-input').fill(testProject.endDate);
    await page.getByTestId('project-priority-select').selectOption(testProject.priority);
    await page.getByTestId('project-status-select').selectOption(testProject.status);
    
    // Submit form
    await page.getByTestId('project-form-submit').click();
    
    // Check date validation error
    await expect(page.getByTestId('field-error-endDate')).toBeVisible();
    await expect(page.getByText('End date must be after start date')).toBeVisible();
  });

  test('should validate budget is not negative', async ({ page }) => {
    const testProject = TestDataFactory.createProject();
    
    // Click Add Project button
    await page.getByTestId('add-project-button').click();
    
    // Fill form with negative budget
    await page.getByTestId('project-name-input').fill(testProject.name);
    await page.getByTestId('project-description-textarea').fill(testProject.description);
    await page.getByTestId('project-start-date-input').fill(testProject.startDate);
    await page.getByTestId('project-budget-input').fill('-5000');
    await page.getByTestId('project-priority-select').selectOption(testProject.priority);
    await page.getByTestId('project-status-select').selectOption(testProject.status);
    
    // Submit form
    await page.getByTestId('project-form-submit').click();
    
    // Check budget validation error
    await expect(page.getByTestId('field-error-budget')).toBeVisible();
    await expect(page.getByText('Budget cannot be negative')).toBeVisible();
  });

  test('should display and filter projects by status', async ({ page }) => {
    // Create test projects with different statuses
    const activeProject = TestDataFactory.createProject({ status: 'active' });
    const plannedProject = TestDataFactory.createProject({ status: 'planning' });
    const completedProject = TestDataFactory.createProject({ status: 'completed' });
    
    // Create projects via API
    for (const project of [activeProject, plannedProject, completedProject]) {
      await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
      });
    }
    
    // Refresh page to load projects
    await page.reload();
    await expect(page.getByTestId('project-list')).toBeVisible();
    
    // Verify all projects are displayed
    await expect(page.getByText(activeProject.name)).toBeVisible();
    await expect(page.getByText(plannedProject.name)).toBeVisible();
    await expect(page.getByText(completedProject.name)).toBeVisible();
    
    // Check status badges are displayed correctly
    await expect(page.locator('[data-testid*="project-status"]').getByText('Active')).toBeVisible();
    await expect(page.locator('[data-testid*="project-status"]').getByText('Planning')).toBeVisible();
    await expect(page.locator('[data-testid*="project-status"]').getByText('Completed')).toBeVisible();
  });

  test('should display priority badges correctly', async ({ page }) => {
    // Create projects with different priorities
    const highPriorityProject = TestDataFactory.createProject({ priority: 'high' });
    const mediumPriorityProject = TestDataFactory.createProject({ priority: 'medium' });
    const lowPriorityProject = TestDataFactory.createProject({ priority: 'low' });
    
    // Create projects via API
    for (const project of [highPriorityProject, mediumPriorityProject, lowPriorityProject]) {
      await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
      });
    }
    
    // Refresh page to load projects
    await page.reload();
    
    // Check priority badges
    await expect(page.locator('[data-testid*="project-priority"]').getByText('High')).toBeVisible();
    await expect(page.locator('[data-testid*="project-priority"]').getByText('Medium')).toBeVisible();
    await expect(page.locator('[data-testid*="project-priority"]').getByText('Low')).toBeVisible();
  });

  test('should edit an existing project', async ({ page }) => {
    // Create a project via API first
    const originalProject = TestDataFactory.createProject();
    
    const createResponse = await fetch(`${API_BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(originalProject)
    });
    
    const createdProject = await createResponse.json();
    const projectId = createdProject.data.id;
    
    // Reload page to show the project
    await page.reload();
    
    // Click edit button for the project
    await page.getByTestId(`edit-project-${projectId}`).click();
    
    // Update project information
    const updatedData = TestDataFactory.createProject();
    
    await page.getByTestId('project-name-input').clear();
    await page.getByTestId('project-name-input').fill(updatedData.name);
    
    await page.getByTestId('project-description-textarea').clear();
    await page.getByTestId('project-description-textarea').fill(updatedData.description);
    
    await page.getByTestId('project-client-input').clear();
    await page.getByTestId('project-client-input').fill(updatedData.clientName);
    
    // Submit the update
    await page.getByTestId('project-form-submit').click();
    
    // Wait for loading to complete
    await expect(page.getByTestId('loading-spinner')).toBeHidden({ timeout: 10000 });
    
    // Verify updates are displayed
    await expect(page.getByText(updatedData.name)).toBeVisible();
    await expect(page.getByText(updatedData.clientName)).toBeVisible();
  });

  test('should delete a project', async ({ page }) => {
    // Create a project via API first
    const testProject = TestDataFactory.createProject();
    
    const createResponse = await fetch(`${API_BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testProject)
    });
    
    const createdProject = await createResponse.json();
    const projectId = createdProject.data.id;
    
    // Reload page to show the project
    await page.reload();
    
    // Verify project is displayed
    await expect(page.getByText(testProject.name)).toBeVisible();
    
    // Click delete button
    await page.getByTestId(`delete-project-${projectId}`).click();
    
    // Confirm deletion in dialog
    await page.getByTestId('confirm-delete').click();
    
    // Wait for deletion to complete
    await page.waitForTimeout(2000);
    
    // Verify project is removed from the list
    await expect(page.getByText(testProject.name)).not.toBeVisible();
  });

  test('should display project cards with all information', async ({ page }) => {
    // Create a project with full information
    const testProject = TestDataFactory.createProject({
      budget: 50000,
      clientName: 'Acme Corporation'
    });
    
    const createResponse = await fetch(`${API_BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testProject)
    });
    
    const createdProject = await createResponse.json();
    const projectId = createdProject.data.id;
    
    // Reload page to show the project
    await page.reload();
    
    // Verify project card displays all information
    await expect(page.getByTestId(`project-name-${projectId}`)).toHaveText(testProject.name);
    await expect(page.getByTestId(`project-client-${projectId}`)).toHaveText(testProject.clientName);
    await expect(page.getByTestId(`project-description-${projectId}`)).toHaveText(testProject.description);
    await expect(page.getByTestId(`project-status-${projectId}`)).toBeVisible();
    await expect(page.getByTestId(`project-priority-${projectId}`)).toBeVisible();
    await expect(page.getByTestId(`project-dates-${projectId}`)).toBeVisible();
    await expect(page.getByTestId(`project-budget-${projectId}`)).toContainText('$50,000');
  });

  test('should handle form cancellation', async ({ page }) => {
    // Click Add Project button
    await page.getByTestId('add-project-button').click();
    
    // Verify form is visible
    await expect(page.getByTestId('project-form')).toBeVisible();
    
    // Click cancel button
    await page.getByText('Cancel').click();
    
    // Verify form is hidden
    await expect(page.getByTestId('project-form')).not.toBeVisible();
    
    // Verify we're back to project list
    await expect(page.getByTestId('project-list')).toBeVisible();
  });

  test('should show loading states correctly', async ({ page }) => {
    const testProject = TestDataFactory.createProject();
    
    // Click Add Project button
    await page.getByTestId('add-project-button').click();
    
    // Fill form
    await page.getByTestId('project-name-input').fill(testProject.name);
    await page.getByTestId('project-description-textarea').fill(testProject.description);
    await page.getByTestId('project-start-date-input').fill(testProject.startDate);
    await page.getByTestId('project-priority-select').selectOption(testProject.priority);
    await page.getByTestId('project-status-select').selectOption(testProject.status);
    
    // Submit form and check loading state
    await page.getByTestId('project-form-submit').click();
    
    // Verify loading spinner appears
    await expect(page.getByTestId('loading-spinner')).toBeVisible();
    await expect(page.getByText('Creating...')).toBeVisible();
    
    // Wait for completion
    await expect(page.getByTestId('loading-spinner')).toBeHidden({ timeout: 10000 });
    
    // Verify project was created
    await expect(page.getByText(testProject.name)).toBeVisible();
  });

  test('should format dates correctly in project cards', async ({ page }) => {
    const testProject = TestDataFactory.createProject({
      startDate: '2024-01-15',
      endDate: '2024-06-30'
    });
    
    const createResponse = await fetch(`${API_BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testProject)
    });
    
    const createdProject = await createResponse.json();
    const projectId = createdProject.data.id;
    
    // Reload page
    await page.reload();
    
    // Check date formatting (should be in format like "Jan 15, 2024 - Jun 30, 2024")
    const dateElement = page.getByTestId(`project-dates-${projectId}`);
    await expect(dateElement).toContainText('Jan 15, 2024');
    await expect(dateElement).toContainText('Jun 30, 2024');
  });

  test('should format budget correctly', async ({ page }) => {
    const testProject = TestDataFactory.createProject({
      budget: 125000
    });
    
    const createResponse = await fetch(`${API_BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testProject)
    });
    
    const createdProject = await createResponse.json();
    const projectId = createdProject.data.id;
    
    // Reload page
    await page.reload();
    
    // Check budget formatting (should be $125,000)
    await expect(page.getByTestId(`project-budget-${projectId}`)).toContainText('$125,000');
  });
});
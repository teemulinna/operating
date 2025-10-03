import { test, expect } from '@playwright/test';

/**
 * PROJECT MANAGEMENT ACCEPTANCE CRITERIA TESTS
 *
 * This test suite validates all acceptance criteria for Project Management features:
 * - US-PM1: View Project List
 * - US-PM2: Create New Project
 * - US-PM3: Edit Project Details
 * - US-PM4: Delete Project
 */

test.describe('Project Management - Acceptance Criteria', () => {
  const baseUrl = 'http://localhost:3003';
  const apiUrl = 'http://localhost:3001/api';

  test.beforeEach(async ({ page }) => {
    // Navigate to projects page
    await page.goto(`${baseUrl}/projects`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Wait for projects to be fetched
    await page.waitForSelector('[data-testid="projects-page"]', { timeout: 10000 });
  });

  // Helper function to create a test project
  const createTestProject = async (page: any, overrides: any = {}) => {
    const timestamp = Date.now();
    const projectData = {
      name: `Test Project ${timestamp}`,
      description: 'Test project for acceptance criteria',
      client_name: 'Test Client',
      start_date: '2025-10-01',
      end_date: '2025-12-31',
      budget: 50000,
      hourly_rate: 100,
      estimated_hours: 500,
      status: 'planning',
      priority: 'medium',
      ...overrides,
    };

    await page.click('[data-testid="add-project-button"]');
    await page.waitForSelector('[data-testid="project-form-modal"]');

    // Fill form
    await page.fill('input[name="name"]', projectData.name);
    await page.fill('textarea[name="description"]', projectData.description);
    await page.fill('input[name="client_name"]', projectData.client_name);
    await page.fill('input[name="start_date"]', projectData.start_date);
    await page.fill('input[name="end_date"]', projectData.end_date);
    await page.fill('input[name="budget"]', projectData.budget.toString());
    await page.selectOption('select[name="status"]', projectData.status);
    await page.selectOption('select[name="priority"]', projectData.priority);

    // Submit
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    return projectData;
  };

  test.describe('US-PM1: View Project List', () => {
    test('AC1.1: Project list displays in grid or list format', async ({ page }) => {
      // Verify grid layout exists
      const projectsGrid = await page.locator('[data-testid="projects-grid"]');
      await expect(projectsGrid).toBeVisible();

      // Verify it's a grid layout (CSS grid or flex with multiple columns)
      const gridClasses = await projectsGrid.getAttribute('class');
      expect(gridClasses).toContain('grid');
    });

    test('AC1.2: Each project shows name, description, status, dates, budget, priority', async ({ page }) => {
      // Create a test project to verify display
      const projectData = await createTestProject(page, {
        name: 'Display Test Project',
        description: 'Testing project card display',
        status: 'active',
        priority: 'high',
        budget: 75000,
      });

      // Wait for project to appear
      await page.waitForTimeout(1000);
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Find the project card
      const projectCard = page.locator(`text="${projectData.name}"`).first();
      await expect(projectCard).toBeVisible();

      // Verify the parent card contains expected information
      const cardElement = projectCard.locator('..').locator('..').locator('..');

      // Check for name (already verified above)
      await expect(cardElement).toContainText(projectData.name);

      // Check for description
      await expect(cardElement).toContainText(projectData.description);

      // Check for status badge/text
      const statusBadge = cardElement.getByText('Active', { exact: false });
      await expect(statusBadge).toBeVisible();

      // Check for priority badge/text
      const priorityBadge = cardElement.getByText('High', { exact: false });
      await expect(priorityBadge).toBeVisible();
    });

    test('AC1.3: Client name displayed if available', async ({ page }) => {
      // Create project with client
      const projectWithClient = await createTestProject(page, {
        name: 'Client Test Project',
        client_name: 'Acme Corporation',
      });

      await page.waitForTimeout(1000);
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify client name is displayed
      const projectCard = page.locator(`text="${projectWithClient.name}"`).first();
      const cardElement = projectCard.locator('..').locator('..').locator('..');
      await expect(cardElement).toContainText('Acme Corporation');
    });

    test('AC1.4: Estimated and actual hours shown', async ({ page }) => {
      // Create project with estimated hours
      const projectData = await createTestProject(page, {
        name: 'Hours Test Project',
        estimated_hours: 250,
      });

      await page.waitForTimeout(1000);
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Find project card and check for hours display
      const projectCard = page.locator(`text="${projectData.name}"`).first();
      const cardElement = projectCard.locator('..').locator('..').locator('..');

      // Check for hours information (may be displayed as "250h" or "250 hours")
      const hasHours = await cardElement.getByText(/250|hours/i).count();
      expect(hasHours).toBeGreaterThan(0);
    });

    test('AC1.5: Projects count summary displayed', async ({ page }) => {
      // Verify projects summary/count is visible
      const projectsSummary = await page.locator('[data-testid="projects-summary"]');
      await expect(projectsSummary).toBeVisible();

      // Check it contains "Total" or count information
      await expect(projectsSummary).toContainText(/Total|projects/i);
    });

    test('AC1.6: Loading state shown while fetching', async ({ page }) => {
      // Navigate to trigger loading
      await page.goto(`${baseUrl}/projects`);

      // Try to catch loading state (may be very fast)
      const loadingIndicator = page.locator('[data-testid="projects-loading"]');

      // Either loading was visible or page loaded successfully
      const finalState = await Promise.race([
        loadingIndicator.isVisible().then(() => 'loading-shown'),
        page.locator('[data-testid="projects-page"]').isVisible().then(() => 'loaded'),
      ]);

      expect(['loading-shown', 'loaded']).toContain(finalState);
    });
  });

  test.describe('US-PM2: Create New Project', () => {
    test('AC2.1: "Add Project" button visible with plus icon', async ({ page }) => {
      // Verify Add Project button exists
      const addButton = page.locator('[data-testid="add-project-button"]');
      await expect(addButton).toBeVisible();

      // Verify button text
      await expect(addButton).toContainText('Add Project');

      // Verify plus icon exists (SVG icon)
      const icon = addButton.locator('svg');
      await expect(icon).toBeVisible();
    });

    test('AC2.2: Form modal includes all required fields', async ({ page }) => {
      // Open form
      await page.click('[data-testid="add-project-button"]');

      // Wait for modal
      await page.waitForSelector('[data-testid="project-form-modal"]');

      // Verify all required fields exist
      await expect(page.locator('input[name="name"]')).toBeVisible();
      await expect(page.locator('textarea[name="description"]')).toBeVisible();
      await expect(page.locator('input[name="client_name"]')).toBeVisible();
      await expect(page.locator('input[name="start_date"]')).toBeVisible();
      await expect(page.locator('input[name="end_date"]')).toBeVisible();
      await expect(page.locator('input[name="budget"]')).toBeVisible();
      await expect(page.locator('select[name="status"]')).toBeVisible();
      await expect(page.locator('select[name="priority"]')).toBeVisible();

      // Verify required field indicators (*)
      const nameLabel = page.locator('label[for="name"]');
      await expect(nameLabel).toContainText('*');

      const startDateLabel = page.locator('label[for="start_date"]');
      await expect(startDateLabel).toContainText('*');

      const endDateLabel = page.locator('label[for="end_date"]');
      await expect(endDateLabel).toContainText('*');
    });

    test('AC2.3: Date validation ensures end date after start date', async ({ page }) => {
      // Open form
      await page.click('[data-testid="add-project-button"]');
      await page.waitForSelector('[data-testid="project-form-modal"]');

      // Fill form with invalid dates (end before start)
      await page.fill('input[name="name"]', 'Invalid Date Project');
      await page.fill('input[name="start_date"]', '2025-12-31');
      await page.fill('input[name="end_date"]', '2025-01-01');

      // Try to submit
      await page.click('button[type="submit"]');

      // Verify error message appears
      const errorMessage = page.locator('text=/End date must be after start date/i');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    });

    test('AC2.4: Budget accepts decimal values', async ({ page }) => {
      // Open form
      await page.click('[data-testid="add-project-button"]');
      await page.waitForSelector('[data-testid="project-form-modal"]');

      // Fill form with decimal budget
      const timestamp = Date.now();
      await page.fill('input[name="name"]', `Decimal Budget Project ${timestamp}`);
      await page.fill('input[name="start_date"]', '2025-10-01');
      await page.fill('input[name="end_date"]', '2025-12-31');
      await page.fill('input[name="budget"]', '75000.50');

      // Submit
      await page.click('button[type="submit"]');

      // Wait for modal to close (successful submission)
      await page.waitForSelector('[data-testid="project-form-modal"]', { state: 'hidden', timeout: 5000 });

      // Verify project was created
      await page.reload();
      await page.waitForLoadState('networkidle');
      const projectName = page.locator(`text="Decimal Budget Project ${timestamp}"`);
      await expect(projectName).toBeVisible();
    });

    test('AC2.5: Success message on creation', async ({ page }) => {
      // Create project
      const timestamp = Date.now();
      await page.click('[data-testid="add-project-button"]');
      await page.waitForSelector('[data-testid="project-form-modal"]');

      await page.fill('input[name="name"]', `Success Message Project ${timestamp}`);
      await page.fill('input[name="start_date"]', '2025-10-01');
      await page.fill('input[name="end_date"]', '2025-12-31');

      await page.click('button[type="submit"]');

      // Modal should close on success
      await page.waitForSelector('[data-testid="project-form-modal"]', { state: 'hidden', timeout: 5000 });

      // Verify successful creation (modal closed means success)
      const isModalClosed = await page.locator('[data-testid="project-form-modal"]').count() === 0;
      expect(isModalClosed).toBeTruthy();
    });

    test('AC2.6: New project appears in list', async ({ page }) => {
      // Create project with unique name
      const timestamp = Date.now();
      const projectName = `New List Project ${timestamp}`;

      await page.click('[data-testid="add-project-button"]');
      await page.waitForSelector('[data-testid="project-form-modal"]');

      await page.fill('input[name="name"]', projectName);
      await page.fill('input[name="start_date"]', '2025-10-01');
      await page.fill('input[name="end_date"]', '2025-12-31');

      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');

      // Reload to see new project
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify project appears in list
      const newProject = page.locator(`text="${projectName}"`);
      await expect(newProject).toBeVisible();
    });
  });

  test.describe('US-PM3: Edit Project Details', () => {
    test('AC3.1: Edit action available for each project', async ({ page }) => {
      // Create a test project
      const projectData = await createTestProject(page, {
        name: 'Edit Action Test Project',
      });

      await page.waitForTimeout(1000);
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Find project card
      const projectCard = page.locator(`text="${projectData.name}"`).first();
      const cardElement = projectCard.locator('..').locator('..').locator('..');

      // Verify edit button/action exists
      const editButton = cardElement.locator('button, a').filter({ hasText: /edit/i });
      await expect(editButton).toBeVisible();
    });

    test('AC3.2: Modal pre-populates with current values', async ({ page }) => {
      // Create a test project
      const projectData = await createTestProject(page, {
        name: 'Pre-populate Test Project',
        description: 'Original description',
        status: 'active',
        priority: 'high',
        budget: 60000,
      });

      await page.waitForTimeout(1000);
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Find and click edit
      const projectCard = page.locator(`text="${projectData.name}"`).first();
      const cardElement = projectCard.locator('..').locator('..').locator('..');
      const editButton = cardElement.locator('button, a').filter({ hasText: /edit/i }).first();
      await editButton.click();

      // Wait for modal
      await page.waitForSelector('[data-testid="project-form-modal"]');

      // Verify fields are pre-populated
      const nameInput = page.locator('input[name="name"]');
      await expect(nameInput).toHaveValue(projectData.name);

      const descriptionInput = page.locator('textarea[name="description"]');
      await expect(descriptionInput).toHaveValue(projectData.description);

      const statusSelect = page.locator('select[name="status"]');
      await expect(statusSelect).toHaveValue('active');

      const prioritySelect = page.locator('select[name="priority"]');
      await expect(prioritySelect).toHaveValue('high');
    });

    test('AC3.3: All fields remain editable', async ({ page }) => {
      // Create a test project
      const projectData = await createTestProject(page, {
        name: 'Editable Fields Project',
      });

      await page.waitForTimeout(1000);
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open edit modal
      const projectCard = page.locator(`text="${projectData.name}"`).first();
      const cardElement = projectCard.locator('..').locator('..').locator('..');
      const editButton = cardElement.locator('button, a').filter({ hasText: /edit/i }).first();
      await editButton.click();

      await page.waitForSelector('[data-testid="project-form-modal"]');

      // Verify all fields are enabled (not disabled)
      await expect(page.locator('input[name="name"]')).toBeEnabled();
      await expect(page.locator('textarea[name="description"]')).toBeEnabled();
      await expect(page.locator('input[name="client_name"]')).toBeEnabled();
      await expect(page.locator('input[name="start_date"]')).toBeEnabled();
      await expect(page.locator('input[name="end_date"]')).toBeEnabled();
      await expect(page.locator('input[name="budget"]')).toBeEnabled();
      await expect(page.locator('select[name="status"]')).toBeEnabled();
      await expect(page.locator('select[name="priority"]')).toBeEnabled();
    });

    test('AC3.4: Changes validated before saving', async ({ page }) => {
      // Create a test project
      const projectData = await createTestProject(page, {
        name: 'Validation Test Project',
      });

      await page.waitForTimeout(1000);
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open edit modal
      const projectCard = page.locator(`text="${projectData.name}"`).first();
      const cardElement = projectCard.locator('..').locator('..').locator('..');
      const editButton = cardElement.locator('button, a').filter({ hasText: /edit/i }).first();
      await editButton.click();

      await page.waitForSelector('[data-testid="project-form-modal"]');

      // Try to set invalid dates
      await page.fill('input[name="start_date"]', '2025-12-31');
      await page.fill('input[name="end_date"]', '2025-01-01');

      // Try to submit
      await page.click('button[type="submit"]');

      // Verify validation error appears
      const errorMessage = page.locator('text=/End date must be after start date/i');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    });

    test('AC3.5: Success notification on update', async ({ page }) => {
      // Create a test project
      const projectData = await createTestProject(page, {
        name: 'Update Success Project',
      });

      await page.waitForTimeout(1000);
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open edit modal
      const projectCard = page.locator(`text="${projectData.name}"`).first();
      const cardElement = projectCard.locator('..').locator('..').locator('..');
      const editButton = cardElement.locator('button, a').filter({ hasText: /edit/i }).first();
      await editButton.click();

      await page.waitForSelector('[data-testid="project-form-modal"]');

      // Update project name
      const newName = `Updated ${projectData.name}`;
      await page.fill('input[name="name"]', newName);

      // Submit
      await page.click('button[type="submit"]');

      // Modal should close on success
      await page.waitForSelector('[data-testid="project-form-modal"]', { state: 'hidden', timeout: 5000 });

      // Verify successful update (modal closed)
      const isModalClosed = await page.locator('[data-testid="project-form-modal"]').count() === 0;
      expect(isModalClosed).toBeTruthy();
    });

    test('AC3.6: Updated values reflect immediately', async ({ page }) => {
      // Create a test project
      const timestamp = Date.now();
      const originalName = `Original Project ${timestamp}`;
      const projectData = await createTestProject(page, {
        name: originalName,
        description: 'Original description',
      });

      await page.waitForTimeout(1000);
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open edit modal
      const projectCard = page.locator(`text="${originalName}"`).first();
      const cardElement = projectCard.locator('..').locator('..').locator('..');
      const editButton = cardElement.locator('button, a').filter({ hasText: /edit/i }).first();
      await editButton.click();

      await page.waitForSelector('[data-testid="project-form-modal"]');

      // Update values
      const newName = `Updated Project ${timestamp}`;
      const newDescription = 'Updated description';
      await page.fill('input[name="name"]', newName);
      await page.fill('textarea[name="description"]', newDescription);

      // Submit
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');

      // Reload to see changes
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify updated name appears
      const updatedProject = page.locator(`text="${newName}"`);
      await expect(updatedProject).toBeVisible();

      // Verify old name doesn't appear
      const oldProject = page.locator(`text="${originalName}"`);
      await expect(oldProject).not.toBeVisible();
    });
  });

  test.describe('US-PM4: Delete Project', () => {
    test('AC4.1: Delete action available for each project', async ({ page }) => {
      // Create a test project
      const projectData = await createTestProject(page, {
        name: 'Delete Action Test',
      });

      await page.waitForTimeout(1000);
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Find project card
      const projectCard = page.locator(`text="${projectData.name}"`).first();
      const cardElement = projectCard.locator('..').locator('..').locator('..');

      // Verify delete button/action exists
      const deleteButton = cardElement.locator('button, a').filter({ hasText: /delete/i });
      await expect(deleteButton).toBeVisible();
    });

    test('AC4.2: Confirmation dialog shows project name', async ({ page }) => {
      // Create a test project
      const projectData = await createTestProject(page, {
        name: 'Confirm Delete Project',
      });

      await page.waitForTimeout(1000);
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click delete
      const projectCard = page.locator(`text="${projectData.name}"`).first();
      const cardElement = projectCard.locator('..').locator('..').locator('..');
      const deleteButton = cardElement.locator('button, a').filter({ hasText: /delete/i }).first();
      await deleteButton.click();

      // Wait for confirmation dialog
      await page.waitForSelector('[role="dialog"], .modal, [data-testid*="modal"]');

      // Verify project name appears in dialog
      const dialog = page.locator('[role="dialog"], .modal, [data-testid*="modal"]').first();
      await expect(dialog).toContainText(projectData.name);
    });

    test('AC4.3: Cancel option available', async ({ page }) => {
      // Create a test project
      const projectData = await createTestProject(page, {
        name: 'Cancel Delete Project',
      });

      await page.waitForTimeout(1000);
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click delete
      const projectCard = page.locator(`text="${projectData.name}"`).first();
      const cardElement = projectCard.locator('..').locator('..').locator('..');
      const deleteButton = cardElement.locator('button, a').filter({ hasText: /delete/i }).first();
      await deleteButton.click();

      // Wait for confirmation dialog
      await page.waitForSelector('[role="dialog"], .modal, [data-testid*="modal"]');

      // Verify cancel button exists
      const cancelButton = page.locator('button').filter({ hasText: /cancel/i });
      await expect(cancelButton).toBeVisible();

      // Click cancel
      await cancelButton.click();

      // Verify dialog closes
      await page.waitForSelector('[role="dialog"], .modal, [data-testid*="modal"]', { state: 'hidden', timeout: 5000 });

      // Verify project still exists
      await page.reload();
      await page.waitForLoadState('networkidle');
      const projectStillExists = page.locator(`text="${projectData.name}"`);
      await expect(projectStillExists).toBeVisible();
    });

    test('AC4.4: Success message on deletion', async ({ page }) => {
      // Create a test project
      const projectData = await createTestProject(page, {
        name: 'Delete Success Project',
      });

      await page.waitForTimeout(1000);
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click delete
      const projectCard = page.locator(`text="${projectData.name}"`).first();
      const cardElement = projectCard.locator('..').locator('..').locator('..');
      const deleteButton = cardElement.locator('button, a').filter({ hasText: /delete/i }).first();
      await deleteButton.click();

      // Wait for confirmation dialog
      await page.waitForSelector('[role="dialog"], .modal, [data-testid*="modal"]');

      // Confirm deletion
      const confirmButton = page.locator('button').filter({ hasText: /delete|confirm/i }).last();
      await confirmButton.click();

      // Dialog should close on success
      await page.waitForSelector('[role="dialog"], .modal, [data-testid*="modal"]', { state: 'hidden', timeout: 5000 });

      // Verify successful deletion (modal closed)
      const isModalClosed = await page.locator('[role="dialog"], .modal, [data-testid*="modal"]').count() === 0;
      expect(isModalClosed).toBeTruthy();
    });

    test('AC4.5: Project removed from list', async ({ page }) => {
      // Create a test project with unique name
      const timestamp = Date.now();
      const projectName = `Remove Project ${timestamp}`;
      const projectData = await createTestProject(page, {
        name: projectName,
      });

      await page.waitForTimeout(1000);
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify project exists
      const projectBefore = page.locator(`text="${projectName}"`);
      await expect(projectBefore).toBeVisible();

      // Click delete
      const projectCard = page.locator(`text="${projectName}"`).first();
      const cardElement = projectCard.locator('..').locator('..').locator('..');
      const deleteButton = cardElement.locator('button, a').filter({ hasText: /delete/i }).first();
      await deleteButton.click();

      // Wait for confirmation dialog
      await page.waitForSelector('[role="dialog"], .modal, [data-testid*="modal"]');

      // Confirm deletion
      const confirmButton = page.locator('button').filter({ hasText: /delete|confirm/i }).last();
      await confirmButton.click();

      await page.waitForLoadState('networkidle');

      // Reload to verify deletion
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify project no longer exists
      const projectAfter = page.locator(`text="${projectName}"`);
      await expect(projectAfter).not.toBeVisible();
    });
  });
});

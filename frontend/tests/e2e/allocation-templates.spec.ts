import { test, expect, Page } from '@playwright/test';

const TEMPLATE_DATA = {
  webDev: {
    name: 'E2E Web Development Template',
    description: 'Full-stack web application template for testing',
    category: 'web_development',
    tags: ['web', 'react', 'nodejs', 'e2e-test'],
    duration: '12',
    budgetMin: '10000',
    budgetMax: '50000'
  },
  mobileApp: {
    name: 'E2E Mobile App Template',
    description: 'Cross-platform mobile application template',
    category: 'mobile_app',
    tags: ['mobile', 'react-native', 'e2e-test'],
    duration: '16',
    budgetMin: '15000',
    budgetMax: '75000'
  }
};

const ROLE_DATA = {
  frontend: {
    name: 'Frontend Developer',
    description: 'React/Vue.js frontend development',
    allocation: '60',
    hoursPerWeek: '24',
    duration: '10',
    experienceLevel: 'mid',
    rateMin: '50',
    rateMax: '80'
  },
  backend: {
    name: 'Backend Developer',
    description: 'Node.js/Python API development',
    allocation: '80',
    hoursPerWeek: '32',
    duration: '12',
    experienceLevel: 'senior',
    rateMin: '60',
    rateMax: '100'
  }
};

// Helper functions
async function navigateToTemplatesLibrary(page: Page) {
  await page.goto('/allocation-templates');
  await expect(page.locator('h1')).toContainText('Template Library');
}

async function createTemplate(page: Page, templateData: typeof TEMPLATE_DATA.webDev) {
  // Click create template button
  await page.click('button:has-text("Create Template")');
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  
  // Fill basic information
  await page.fill('input[id="name"]', templateData.name);
  await page.fill('textarea[id="description"]', templateData.description);
  await page.selectOption('select[id="category"]', templateData.category);
  
  if (templateData.duration) {
    await page.fill('input[id="duration"]', templateData.duration);
  }
  
  if (templateData.budgetMin && templateData.budgetMax) {
    await page.fill('input[placeholder="Min budget"]', templateData.budgetMin);
    await page.fill('input[placeholder="Max budget"]', templateData.budgetMax);
  }
  
  // Add tags
  for (const tag of templateData.tags) {
    await page.fill('input[placeholder="Add a tag..."]', tag);
    await page.click('button:has-text("Add")');
  }
}

async function addRoleToTemplate(page: Page, roleData: typeof ROLE_DATA.frontend) {
  // Navigate to roles tab
  await page.click('button[role="tab"]:has-text("Roles")');
  
  // Fill role information
  await page.fill('input[id="role_name"]', roleData.name);
  await page.fill('textarea[id="role_description"]', roleData.description);
  await page.fill('input[id="allocation"]', roleData.allocation);
  await page.fill('input[id="hours_per_week"]', roleData.hoursPerWeek);
  await page.fill('input[id="duration"]', roleData.duration);
  
  await page.selectOption('select', roleData.experienceLevel);
  
  if (roleData.rateMin && roleData.rateMax) {
    await page.fill('input[placeholder="Min rate"]', roleData.rateMin);
    await page.fill('input[placeholder="Max rate"]', roleData.rateMax);
  }
  
  // Add role
  await page.click('button:has-text("Add Role")');
}

test.describe('Allocation Templates E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication/session if needed
    await page.addInitScript(() => {
      localStorage.setItem('user-id', 'e2e-test-user');
    });
  });

  test.describe('Template Library Interface', () => {
    test('should display template library with search and filters', async ({ page }) => {
      await navigateToTemplatesLibrary(page);
      
      // Check main elements are visible
      await expect(page.locator('h1')).toContainText('Template Library');
      await expect(page.locator('input[placeholder*="Search templates"]')).toBeVisible();
      await expect(page.locator('button:has-text("Create Template")')).toBeVisible();
      
      // Check filter controls
      await expect(page.locator('select').first()).toBeVisible(); // Category filter
      await expect(page.locator('button[role="button"]', { hasText: 'Grid' }).or(page.locator('button[role="button"]', { hasText: 'List' }))).toBeVisible(); // View toggle
    });

    test('should toggle between grid and list view', async ({ page }) => {
      await navigateToTemplatesLibrary(page);
      
      // Default should be grid view
      await expect(page.locator('[class*="grid"]')).toBeVisible();
      
      // Switch to list view
      await page.click('button:has-text("List")');
      await expect(page.locator('[class*="space-y"]')).toBeVisible();
      
      // Switch back to grid view
      await page.click('button:has-text("Grid")');
      await expect(page.locator('[class*="grid"]')).toBeVisible();
    });

    test('should filter templates by category', async ({ page }) => {
      await navigateToTemplatesLibrary(page);
      
      // Select web development category
      await page.selectOption('select:first', 'web_development');
      
      // Wait for results to load
      await page.waitForLoadState('networkidle');
      
      // Check that category filter is applied (look for specific badges or text)
      const templates = page.locator('[data-testid="template-card"]');
      if (await templates.count() > 0) {
        await expect(templates.first()).toContainText('Web Development');
      }
    });

    test('should search templates by name and description', async ({ page }) => {
      await navigateToTemplatesLibrary(page);
      
      // Search for "web" templates
      await page.fill('input[placeholder*="Search templates"]', 'web');
      await page.waitForLoadState('networkidle');
      
      // Check search results (if any templates exist)
      const templates = page.locator('[data-testid="template-card"]');
      const count = await templates.count();
      
      if (count > 0) {
        // At least one template should contain "web" in its name or description
        const templateText = await templates.first().textContent();
        expect(templateText?.toLowerCase()).toMatch(/web/);
      }
    });

    test('should display template ratings and usage statistics', async ({ page }) => {
      await navigateToTemplatesLibrary(page);
      
      // Wait for templates to load
      await page.waitForLoadState('networkidle');
      
      const templates = page.locator('[data-testid="template-card"]');
      const count = await templates.count();
      
      if (count > 0) {
        const firstTemplate = templates.first();
        
        // Check for star ratings
        await expect(firstTemplate.locator('[class*="star"]').or(firstTemplate.locator('svg'))).toBeVisible();
        
        // Check for usage count
        await expect(firstTemplate).toContainText(/\d+ uses?/);
        
        // Check for role count
        await expect(firstTemplate).toContainText(/\d+ roles?/);
      }
    });

    test('should handle pagination correctly', async ({ page }) => {
      await navigateToTemplatesLibrary(page);
      await page.waitForLoadState('networkidle');
      
      // Check if pagination is visible (only if there are multiple pages)
      const pagination = page.locator('button:has-text("Next")');
      
      if (await pagination.isVisible()) {
        const currentPage = page.locator('button[aria-current="page"]');
        const initialPageNumber = await currentPage.textContent();
        
        // Click next page
        await pagination.click();
        await page.waitForLoadState('networkidle');
        
        // Verify page changed
        const newPageNumber = await currentPage.textContent();
        expect(newPageNumber).not.toBe(initialPageNumber);
        
        // Go back to previous page
        await page.click('button:has-text("Previous")');
        await page.waitForLoadState('networkidle');
        
        const backToOriginal = await currentPage.textContent();
        expect(backToOriginal).toBe(initialPageNumber);
      }
    });
  });

  test.describe('Template Creation Flow', () => {
    test('should create a complete template with roles', async ({ page }) => {
      await navigateToTemplatesLibrary(page);
      
      // Start template creation
      await createTemplate(page, TEMPLATE_DATA.webDev);
      
      // Add frontend role
      await addRoleToTemplate(page, ROLE_DATA.frontend);
      
      // Verify role was added
      await expect(page.locator('text="Frontend Developer"')).toBeVisible();
      
      // Add backend role
      await addRoleToTemplate(page, ROLE_DATA.backend);
      
      // Verify second role was added
      await expect(page.locator('text="Backend Developer"')).toBeVisible();
      
      // Go to review tab
      await page.click('button[role="tab"]:has-text("Review")');
      
      // Verify template summary
      await expect(page.locator('text="Template Summary"')).toBeVisible();
      await expect(page.locator(`text="${TEMPLATE_DATA.webDev.name}"`)).toBeVisible();
      await expect(page.locator('text="2 roles"')).toBeVisible();
      
      // Create the template
      await page.click('button:has-text("Create Template")');
      
      // Verify creation success (modal should close and we should return to library)
      await expect(page.locator('[role="dialog"]')).toBeHidden();
      
      // Search for the created template
      await page.fill('input[placeholder*="Search templates"]', TEMPLATE_DATA.webDev.name);
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator(`text="${TEMPLATE_DATA.webDev.name}"`)).toBeVisible();
    });

    test('should validate template creation form', async ({ page }) => {
      await navigateToTemplatesLibrary(page);
      
      // Try to create template without required fields
      await page.click('button:has-text("Create Template")');
      
      // Skip name (required field)
      await page.selectOption('select[id="category"]', 'web_development');
      
      // Try to go to roles tab
      await page.click('button[role="tab"]:has-text("Roles")');
      
      // Try to create without roles
      await page.click('button[role="tab"]:has-text("Review")');
      
      // Try to create
      await page.click('button:has-text("Create Template")');
      
      // Should show validation errors
      await expect(page.locator('text*="error"').or(page.locator('[class*="error"]'))).toBeVisible();
    });

    test('should validate role creation form', async ({ page }) => {
      await navigateToTemplatesLibrary(page);
      await createTemplate(page, TEMPLATE_DATA.webDev);
      
      // Go to roles tab
      await page.click('button[role="tab"]:has-text("Roles")');
      
      // Try to add role without required fields
      await page.click('button:has-text("Add Role")');
      
      // Should show validation errors for missing role name and allocation
      await expect(page.locator('text*="error"').or(page.locator('[class*="error"]'))).toBeVisible();
      
      // Fill role name but invalid allocation
      await page.fill('input[id="role_name"]', 'Test Role');
      await page.fill('input[id="allocation"]', '150'); // Invalid - over 100%
      
      await page.click('button:has-text("Add Role")');
      
      // Should show validation error for invalid allocation
      await expect(page.locator('text*="allocation"')).toBeVisible();
    });

    test('should handle tag management correctly', async ({ page }) => {
      await navigateToTemplatesLibrary(page);
      
      await page.click('button:has-text("Create Template")');
      
      // Add tags
      await page.fill('input[placeholder="Add a tag..."]', 'test-tag-1');
      await page.click('button:has-text("Add")');
      
      await page.fill('input[placeholder="Add a tag..."]', 'test-tag-2');
      await page.press('input[placeholder="Add a tag..."]', 'Enter');
      
      // Verify tags were added
      await expect(page.locator('text="test-tag-1"')).toBeVisible();
      await expect(page.locator('text="test-tag-2"')).toBeVisible();
      
      // Remove a tag
      await page.click('button:has([class*="x"]):near(text="test-tag-1")');
      
      // Verify tag was removed
      await expect(page.locator('text="test-tag-1"')).toBeHidden();
      await expect(page.locator('text="test-tag-2"')).toBeVisible();
    });
  });

  test.describe('Template Details and Interaction', () => {
    test('should open and display template details modal', async ({ page }) => {
      await navigateToTemplatesLibrary(page);
      await page.waitForLoadState('networkidle');
      
      // Click on first template card
      const templates = page.locator('[data-testid="template-card"]');
      const count = await templates.count();
      
      if (count > 0) {
        await templates.first().click();
        
        // Verify modal opened
        await expect(page.locator('[role="dialog"]')).toBeVisible();
        
        // Check for key elements in details modal
        await expect(page.locator('[role="tablist"]')).toBeVisible();
        await expect(page.locator('button[role="tab"]:has-text("Overview")')).toBeVisible();
        await expect(page.locator('button[role="tab"]:has-text("Roles")')).toBeVisible();
        await expect(page.locator('button:has-text("Apply to Project")')).toBeVisible();
        await expect(page.locator('button:has-text("Clone")')).toBeVisible();
      }
    });

    test('should navigate between template detail tabs', async ({ page }) => {
      await navigateToTemplatesLibrary(page);
      await page.waitForLoadState('networkidle');
      
      const templates = page.locator('[data-testid="template-card"]');
      const count = await templates.count();
      
      if (count > 0) {
        await templates.first().click();
        
        // Navigate to Roles tab
        await page.click('button[role="tab"]:has-text("Roles")');
        await expect(page.locator('text*="roles defined"')).toBeVisible();
        
        // Navigate to Usage & Stats tab
        await page.click('button[role="tab"]:has-text("Usage")');
        await expect(page.locator('text="Usage Statistics"')).toBeVisible();
        
        // Navigate back to Overview
        await page.click('button[role="tab"]:has-text("Overview")');
        await expect(page.locator('text="Template Information"')).toBeVisible();
      }
    });

    test('should display role details correctly', async ({ page }) => {
      await navigateToTemplatesLibrary(page);
      await page.waitForLoadState('networkidle');
      
      const templates = page.locator('[data-testid="template-card"]');
      const count = await templates.count();
      
      if (count > 0) {
        await templates.first().click();
        
        // Go to roles tab
        await page.click('button[role="tab"]:has-text("Roles")');
        
        // Check for role cards
        const roleCards = page.locator('[class*="card"]:has(text*="Developer")');
        const roleCount = await roleCards.count();
        
        if (roleCount > 0) {
          const firstRole = roleCards.first();
          
          // Check for key role information
          await expect(firstRole).toContainText(/\d+%/); // Allocation percentage
          await expect(firstRole.locator('text*="Experience Level"').or(firstRole)).toBeVisible();
          
          // Check for skills or other role details
          const skillsBadges = firstRole.locator('[class*="badge"]');
          if (await skillsBadges.count() > 0) {
            await expect(skillsBadges.first()).toBeVisible();
          }
        }
      }
    });

    test('should clone template successfully', async ({ page }) => {
      await navigateToTemplatesLibrary(page);
      await page.waitForLoadState('networkidle');
      
      const templates = page.locator('[data-testid="template-card"]');
      const count = await templates.count();
      
      if (count > 0) {
        const originalTemplateName = await templates.first().locator('h3').textContent();
        
        await templates.first().click();
        
        // Clone template
        await page.click('button:has-text("Clone")');
        
        // Wait for clone operation (should show loading or success state)
        await page.waitForTimeout(2000);
        
        // Close modal
        await page.click('button:has-text("Close")');
        
        // Look for cloned template (should appear in the list)
        await page.fill('input[placeholder*="Search templates"]', `${originalTemplateName} (Copy)`);
        await page.waitForLoadState('networkidle');
        
        // Verify clone was created
        await expect(page.locator(`text="${originalTemplateName} (Copy)"`)).toBeVisible();
      }
    });
  });

  test.describe('Template Application to Projects', () => {
    test('should show template application modal', async ({ page }) => {
      await navigateToTemplatesLibrary(page);
      await page.waitForLoadState('networkidle');
      
      const templates = page.locator('[data-testid="template-card"]');
      const count = await templates.count();
      
      if (count > 0) {
        await templates.first().click();
        
        // Click apply to project
        await page.click('button:has-text("Apply to Project")');
        
        // Should show application form/modal
        await expect(page.locator('[role="dialog"]').or(page.locator('form'))).toBeVisible();
        
        // Should have project selection and date fields
        await expect(page.locator('select:has-text("Project")').or(page.locator('input[type="date"]'))).toBeVisible();
      }
    });

    test('should validate application form', async ({ page }) => {
      await navigateToTemplatesLibrary(page);
      await page.waitForLoadState('networkidle');
      
      const templates = page.locator('[data-testid="template-card"]');
      const count = await templates.count();
      
      if (count > 0) {
        await templates.first().click();
        await page.click('button:has-text("Apply to Project")');
        
        // Try to apply without selecting project or date
        await page.click('button:has-text("Apply Template")');
        
        // Should show validation errors
        await expect(page.locator('text*="required"').or(page.locator('[class*="error"]'))).toBeVisible();
      }
    });
  });

  test.describe('Responsive Design and Accessibility', () => {
    test('should be responsive on mobile devices', async ({ page }) => {
      // Set viewport to mobile size
      await page.setViewportSize({ width: 375, height: 667 });
      
      await navigateToTemplatesLibrary(page);
      
      // Check that elements are still visible and accessible
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
      await expect(page.locator('button:has-text("Create Template")')).toBeVisible();
      
      // Templates should stack vertically on mobile
      const templates = page.locator('[data-testid="template-card"]');
      const count = await templates.count();
      
      if (count > 1) {
        const firstTemplate = await templates.first().boundingBox();
        const secondTemplate = await templates.nth(1).boundingBox();
        
        // On mobile, templates should be stacked (second template below first)
        if (firstTemplate && secondTemplate) {
          expect(secondTemplate.y).toBeGreaterThan(firstTemplate.y + firstTemplate.height - 50);
        }
      }
    });

    test('should be keyboard accessible', async ({ page }) => {
      await navigateToTemplatesLibrary(page);
      
      // Test keyboard navigation
      await page.keyboard.press('Tab'); // Should focus search input
      await expect(page.locator('input[placeholder*="Search"]')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Should focus first filter
      await page.keyboard.press('Tab'); // Should focus view toggle or create button
      
      // Test that template cards are focusable
      const templates = page.locator('[data-testid="template-card"]');
      const count = await templates.count();
      
      if (count > 0) {
        // Navigate to first template card
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        
        // Should be able to open template with Enter key
        await page.keyboard.press('Enter');
        
        // Modal should open
        await expect(page.locator('[role="dialog"]')).toBeVisible();
        
        // Should be able to close modal with Escape
        await page.keyboard.press('Escape');
        await expect(page.locator('[role="dialog"]')).toBeHidden();
      }
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await navigateToTemplatesLibrary(page);
      
      // Check for proper ARIA labels
      await expect(page.locator('button[aria-label*="Create"]').or(page.locator('button:has-text("Create Template")'))).toBeVisible();
      
      // Check for proper roles
      await expect(page.locator('[role="main"]').or(page.locator('main'))).toBeVisible();
      
      // Check template cards have proper accessibility
      const templates = page.locator('[data-testid="template-card"]');
      const count = await templates.count();
      
      if (count > 0) {
        const firstTemplate = templates.first();
        
        // Should be focusable and have proper role
        await expect(firstTemplate).toHaveAttribute('role', /button|link|article/);
        
        // Should have descriptive text
        const templateText = await firstTemplate.textContent();
        expect(templateText?.length).toBeGreaterThan(10);
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Intercept network requests and simulate failure
      await page.route('/api/allocation-templates*', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      await navigateToTemplatesLibrary(page);
      
      // Should show error message
      await expect(page.locator('text*="error"').or(page.locator('text*="Error"'))).toBeVisible();
      
      // Should have retry button
      await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
    });

    test('should handle empty state correctly', async ({ page }) => {
      // Mock empty response
      await page.route('/api/allocation-templates*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            templates: [],
            pagination: {
              currentPage: 1,
              totalPages: 0,
              totalItems: 0,
              limit: 20,
              hasNext: false,
              hasPrev: false
            },
            total: 0
          })
        });
      });
      
      await navigateToTemplatesLibrary(page);
      
      // Should show empty state message
      await expect(page.locator('text*="No templates found"')).toBeVisible();
      await expect(page.locator('text*="create a new template"')).toBeVisible();
    });

    test('should handle loading states correctly', async ({ page }) => {
      // Add delay to network requests to test loading state
      await page.route('/api/allocation-templates*', async route => {
        await page.waitForTimeout(2000);
        const response = await page.request.fetch(route.request());
        route.fulfill({ response });
      });
      
      await navigateToTemplatesLibrary(page);
      
      // Should show loading skeleton or spinner
      await expect(page.locator('[class*="animate-pulse"]').or(page.locator('[class*="loading"]'))).toBeVisible();
      
      // Loading should eventually disappear
      await expect(page.locator('[class*="animate-pulse"]').or(page.locator('[class*="loading"]'))).toBeHidden({ timeout: 10000 });
    });

    test('should handle very long template names and descriptions', async ({ page }) => {
      const longTemplateData = {
        name: 'Very Long Template Name That Should Be Truncated Properly Because It Exceeds Normal Display Limits',
        description: 'This is an extremely long description that should test how the UI handles overflow text and ensures that the layout remains intact even when dealing with unusually long content that might break normal text flow and styling.',
        category: 'custom' as const,
        tags: ['very-long-tag-name-that-should-also-be-handled-properly'],
        duration: '24'
      };
      
      await navigateToTemplatesLibrary(page);
      await createTemplate(page, longTemplateData);
      
      // Add a role and complete creation
      await addRoleToTemplate(page, ROLE_DATA.frontend);
      
      await page.click('button[role="tab"]:has-text("Review")');
      await page.click('button:has-text("Create Template")');
      
      // Search for the created template
      await page.fill('input[placeholder*="Search templates"]', 'Very Long Template');
      await page.waitForLoadState('networkidle');
      
      // Check that long content is handled properly (truncated or wrapped)
      const templateCard = page.locator('text*="Very Long Template"').first();
      await expect(templateCard).toBeVisible();
      
      // Ensure layout is not broken
      const cardElement = page.locator('[data-testid="template-card"]').first();
      const boundingBox = await cardElement.boundingBox();
      
      if (boundingBox) {
        // Card should have reasonable width (not stretched infinitely)
        expect(boundingBox.width).toBeLessThan(800);
      }
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('should handle large number of templates', async ({ page }) => {
      // Mock response with many templates
      const manyTemplates = Array.from({ length: 50 }, (_, i) => ({
        id: `template-${i}`,
        name: `Template ${i + 1}`,
        description: `Description for template ${i + 1}`,
        category: 'web_development',
        tags: [`tag-${i}`, 'test'],
        visibility: 'public',
        creator_name: 'Test User',
        total_roles: Math.floor(Math.random() * 5) + 1,
        usage_count: Math.floor(Math.random() * 100),
        created_at: new Date().toISOString(),
        usage_stats: {
          average_rating: Math.random() * 5,
          total_uses: Math.floor(Math.random() * 50)
        }
      }));
      
      await page.route('/api/allocation-templates*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            templates: manyTemplates.slice(0, 20), // First page
            pagination: {
              currentPage: 1,
              totalPages: Math.ceil(manyTemplates.length / 20),
              totalItems: manyTemplates.length,
              limit: 20,
              hasNext: true,
              hasPrev: false
            },
            total: manyTemplates.length
          })
        });
      });
      
      await navigateToTemplatesLibrary(page);
      
      // Should render without performance issues
      await expect(page.locator('[data-testid="template-card"]')).toHaveCount(20);
      
      // Should show correct pagination
      await expect(page.locator('text*="50 templates found"')).toBeVisible();
    });

    test('should maintain performance during search operations', async ({ page }) => {
      await navigateToTemplatesLibrary(page);
      
      const searchInput = page.locator('input[placeholder*="Search templates"]');
      
      // Measure search response time
      const startTime = Date.now();
      
      await searchInput.fill('web');
      await page.waitForLoadState('networkidle');
      
      const endTime = Date.now();
      const searchTime = endTime - startTime;
      
      // Search should complete within reasonable time (5 seconds)
      expect(searchTime).toBeLessThan(5000);
      
      // Clear search and verify reset
      await searchInput.clear();
      await page.waitForLoadState('networkidle');
      
      // Should show all templates again
      await expect(page.locator('[data-testid="template-card"]').or(page.locator('text*="templates found"'))).toBeVisible();
    });
  });

  test.afterEach(async ({ page }) => {
    // Clean up any created test templates
    await page.evaluate(() => {
      // Remove any test templates created during the test
      const testNames = [
        'E2E Web Development Template',
        'E2E Mobile App Template',
        'Very Long Template Name',
        'API Test Template'
      ];
      
      // This would typically call your API to clean up test data
      return Promise.resolve();
    });
  });
});
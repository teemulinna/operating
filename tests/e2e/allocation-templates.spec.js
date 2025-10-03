"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
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
async function navigateToTemplatesLibrary(page) {
    await page.goto('/allocation-templates');
    await (0, test_1.expect)(page.locator('h1')).toContainText('Template Library');
}
async function createTemplate(page, templateData) {
    await page.click('button:has-text("Create Template")');
    await (0, test_1.expect)(page.locator('[role="dialog"]')).toBeVisible();
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
    for (const tag of templateData.tags) {
        await page.fill('input[placeholder="Add a tag..."]', tag);
        await page.click('button:has-text("Add")');
    }
}
async function addRoleToTemplate(page, roleData) {
    await page.click('button[role="tab"]:has-text("Roles")');
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
    await page.click('button:has-text("Add Role")');
}
test_1.test.describe('Allocation Templates E2E Tests', () => {
    test_1.test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('user-id', 'e2e-test-user');
        });
    });
    test_1.test.describe('Template Library Interface', () => {
        (0, test_1.test)('should display template library with search and filters', async ({ page }) => {
            await navigateToTemplatesLibrary(page);
            await (0, test_1.expect)(page.locator('h1')).toContainText('Template Library');
            await (0, test_1.expect)(page.locator('input[placeholder*="Search templates"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('button:has-text("Create Template")')).toBeVisible();
            await (0, test_1.expect)(page.locator('select').first()).toBeVisible();
            await (0, test_1.expect)(page.locator('button[role="button"]', { hasText: 'Grid' }).or(page.locator('button[role="button"]', { hasText: 'List' }))).toBeVisible();
        });
        (0, test_1.test)('should toggle between grid and list view', async ({ page }) => {
            await navigateToTemplatesLibrary(page);
            await (0, test_1.expect)(page.locator('[class*="grid"]')).toBeVisible();
            await page.click('button:has-text("List")');
            await (0, test_1.expect)(page.locator('[class*="space-y"]')).toBeVisible();
            await page.click('button:has-text("Grid")');
            await (0, test_1.expect)(page.locator('[class*="grid"]')).toBeVisible();
        });
        (0, test_1.test)('should filter templates by category', async ({ page }) => {
            await navigateToTemplatesLibrary(page);
            await page.selectOption('select:first', 'web_development');
            await page.waitForLoadState('networkidle');
            const templates = page.locator('[data-testid="template-card"]');
            if (await templates.count() > 0) {
                await (0, test_1.expect)(templates.first()).toContainText('Web Development');
            }
        });
        (0, test_1.test)('should search templates by name and description', async ({ page }) => {
            await navigateToTemplatesLibrary(page);
            await page.fill('input[placeholder*="Search templates"]', 'web');
            await page.waitForLoadState('networkidle');
            const templates = page.locator('[data-testid="template-card"]');
            const count = await templates.count();
            if (count > 0) {
                const templateText = await templates.first().textContent();
                (0, test_1.expect)(templateText?.toLowerCase()).toMatch(/web/);
            }
        });
        (0, test_1.test)('should display template ratings and usage statistics', async ({ page }) => {
            await navigateToTemplatesLibrary(page);
            await page.waitForLoadState('networkidle');
            const templates = page.locator('[data-testid="template-card"]');
            const count = await templates.count();
            if (count > 0) {
                const firstTemplate = templates.first();
                await (0, test_1.expect)(firstTemplate.locator('[class*="star"]').or(firstTemplate.locator('svg'))).toBeVisible();
                await (0, test_1.expect)(firstTemplate).toContainText(/\d+ uses?/);
                await (0, test_1.expect)(firstTemplate).toContainText(/\d+ roles?/);
            }
        });
        (0, test_1.test)('should handle pagination correctly', async ({ page }) => {
            await navigateToTemplatesLibrary(page);
            await page.waitForLoadState('networkidle');
            const pagination = page.locator('button:has-text("Next")');
            if (await pagination.isVisible()) {
                const currentPage = page.locator('button[aria-current="page"]');
                const initialPageNumber = await currentPage.textContent();
                await pagination.click();
                await page.waitForLoadState('networkidle');
                const newPageNumber = await currentPage.textContent();
                (0, test_1.expect)(newPageNumber).not.toBe(initialPageNumber);
                await page.click('button:has-text("Previous")');
                await page.waitForLoadState('networkidle');
                const backToOriginal = await currentPage.textContent();
                (0, test_1.expect)(backToOriginal).toBe(initialPageNumber);
            }
        });
    });
    test_1.test.describe('Template Creation Flow', () => {
        (0, test_1.test)('should create a complete template with roles', async ({ page }) => {
            await navigateToTemplatesLibrary(page);
            await createTemplate(page, TEMPLATE_DATA.webDev);
            await addRoleToTemplate(page, ROLE_DATA.frontend);
            await (0, test_1.expect)(page.locator('text="Frontend Developer"')).toBeVisible();
            await addRoleToTemplate(page, ROLE_DATA.backend);
            await (0, test_1.expect)(page.locator('text="Backend Developer"')).toBeVisible();
            await page.click('button[role="tab"]:has-text("Review")');
            await (0, test_1.expect)(page.locator('text="Template Summary"')).toBeVisible();
            await (0, test_1.expect)(page.locator(`text="${TEMPLATE_DATA.webDev.name}"`)).toBeVisible();
            await (0, test_1.expect)(page.locator('text="2 roles"')).toBeVisible();
            await page.click('button:has-text("Create Template")');
            await (0, test_1.expect)(page.locator('[role="dialog"]')).toBeHidden();
            await page.fill('input[placeholder*="Search templates"]', TEMPLATE_DATA.webDev.name);
            await page.waitForLoadState('networkidle');
            await (0, test_1.expect)(page.locator(`text="${TEMPLATE_DATA.webDev.name}"`)).toBeVisible();
        });
        (0, test_1.test)('should validate template creation form', async ({ page }) => {
            await navigateToTemplatesLibrary(page);
            await page.click('button:has-text("Create Template")');
            await page.selectOption('select[id="category"]', 'web_development');
            await page.click('button[role="tab"]:has-text("Roles")');
            await page.click('button[role="tab"]:has-text("Review")');
            await page.click('button:has-text("Create Template")');
            await (0, test_1.expect)(page.locator('text*="error"').or(page.locator('[class*="error"]'))).toBeVisible();
        });
        (0, test_1.test)('should validate role creation form', async ({ page }) => {
            await navigateToTemplatesLibrary(page);
            await createTemplate(page, TEMPLATE_DATA.webDev);
            await page.click('button[role="tab"]:has-text("Roles")');
            await page.click('button:has-text("Add Role")');
            await (0, test_1.expect)(page.locator('text*="error"').or(page.locator('[class*="error"]'))).toBeVisible();
            await page.fill('input[id="role_name"]', 'Test Role');
            await page.fill('input[id="allocation"]', '150');
            await page.click('button:has-text("Add Role")');
            await (0, test_1.expect)(page.locator('text*="allocation"')).toBeVisible();
        });
        (0, test_1.test)('should handle tag management correctly', async ({ page }) => {
            await navigateToTemplatesLibrary(page);
            await page.click('button:has-text("Create Template")');
            await page.fill('input[placeholder="Add a tag..."]', 'test-tag-1');
            await page.click('button:has-text("Add")');
            await page.fill('input[placeholder="Add a tag..."]', 'test-tag-2');
            await page.press('input[placeholder="Add a tag..."]', 'Enter');
            await (0, test_1.expect)(page.locator('text="test-tag-1"')).toBeVisible();
            await (0, test_1.expect)(page.locator('text="test-tag-2"')).toBeVisible();
            await page.click('button:has([class*="x"]):near(text="test-tag-1")');
            await (0, test_1.expect)(page.locator('text="test-tag-1"')).toBeHidden();
            await (0, test_1.expect)(page.locator('text="test-tag-2"')).toBeVisible();
        });
    });
    test_1.test.describe('Template Details and Interaction', () => {
        (0, test_1.test)('should open and display template details modal', async ({ page }) => {
            await navigateToTemplatesLibrary(page);
            await page.waitForLoadState('networkidle');
            const templates = page.locator('[data-testid="template-card"]');
            const count = await templates.count();
            if (count > 0) {
                await templates.first().click();
                await (0, test_1.expect)(page.locator('[role="dialog"]')).toBeVisible();
                await (0, test_1.expect)(page.locator('[role="tablist"]')).toBeVisible();
                await (0, test_1.expect)(page.locator('button[role="tab"]:has-text("Overview")')).toBeVisible();
                await (0, test_1.expect)(page.locator('button[role="tab"]:has-text("Roles")')).toBeVisible();
                await (0, test_1.expect)(page.locator('button:has-text("Apply to Project")')).toBeVisible();
                await (0, test_1.expect)(page.locator('button:has-text("Clone")')).toBeVisible();
            }
        });
        (0, test_1.test)('should navigate between template detail tabs', async ({ page }) => {
            await navigateToTemplatesLibrary(page);
            await page.waitForLoadState('networkidle');
            const templates = page.locator('[data-testid="template-card"]');
            const count = await templates.count();
            if (count > 0) {
                await templates.first().click();
                await page.click('button[role="tab"]:has-text("Roles")');
                await (0, test_1.expect)(page.locator('text*="roles defined"')).toBeVisible();
                await page.click('button[role="tab"]:has-text("Usage")');
                await (0, test_1.expect)(page.locator('text="Usage Statistics"')).toBeVisible();
                await page.click('button[role="tab"]:has-text("Overview")');
                await (0, test_1.expect)(page.locator('text="Template Information"')).toBeVisible();
            }
        });
        (0, test_1.test)('should display role details correctly', async ({ page }) => {
            await navigateToTemplatesLibrary(page);
            await page.waitForLoadState('networkidle');
            const templates = page.locator('[data-testid="template-card"]');
            const count = await templates.count();
            if (count > 0) {
                await templates.first().click();
                await page.click('button[role="tab"]:has-text("Roles")');
                const roleCards = page.locator('[class*="card"]:has(text*="Developer")');
                const roleCount = await roleCards.count();
                if (roleCount > 0) {
                    const firstRole = roleCards.first();
                    await (0, test_1.expect)(firstRole).toContainText(/\d+%/);
                    await (0, test_1.expect)(firstRole.locator('text*="Experience Level"').or(firstRole)).toBeVisible();
                    const skillsBadges = firstRole.locator('[class*="badge"]');
                    if (await skillsBadges.count() > 0) {
                        await (0, test_1.expect)(skillsBadges.first()).toBeVisible();
                    }
                }
            }
        });
        (0, test_1.test)('should clone template successfully', async ({ page }) => {
            await navigateToTemplatesLibrary(page);
            await page.waitForLoadState('networkidle');
            const templates = page.locator('[data-testid="template-card"]');
            const count = await templates.count();
            if (count > 0) {
                const originalTemplateName = await templates.first().locator('h3').textContent();
                await templates.first().click();
                await page.click('button:has-text("Clone")');
                await page.waitForTimeout(2000);
                await page.click('button:has-text("Close")');
                await page.fill('input[placeholder*="Search templates"]', `${originalTemplateName} (Copy)`);
                await page.waitForLoadState('networkidle');
                await (0, test_1.expect)(page.locator(`text="${originalTemplateName} (Copy)"`)).toBeVisible();
            }
        });
    });
    test_1.test.describe('Template Application to Projects', () => {
        (0, test_1.test)('should show template application modal', async ({ page }) => {
            await navigateToTemplatesLibrary(page);
            await page.waitForLoadState('networkidle');
            const templates = page.locator('[data-testid="template-card"]');
            const count = await templates.count();
            if (count > 0) {
                await templates.first().click();
                await page.click('button:has-text("Apply to Project")');
                await (0, test_1.expect)(page.locator('[role="dialog"]').or(page.locator('form'))).toBeVisible();
                await (0, test_1.expect)(page.locator('select:has-text("Project")').or(page.locator('input[type="date"]'))).toBeVisible();
            }
        });
        (0, test_1.test)('should validate application form', async ({ page }) => {
            await navigateToTemplatesLibrary(page);
            await page.waitForLoadState('networkidle');
            const templates = page.locator('[data-testid="template-card"]');
            const count = await templates.count();
            if (count > 0) {
                await templates.first().click();
                await page.click('button:has-text("Apply to Project")');
                await page.click('button:has-text("Apply Template")');
                await (0, test_1.expect)(page.locator('text*="required"').or(page.locator('[class*="error"]'))).toBeVisible();
            }
        });
    });
    test_1.test.describe('Responsive Design and Accessibility', () => {
        (0, test_1.test)('should be responsive on mobile devices', async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 });
            await navigateToTemplatesLibrary(page);
            await (0, test_1.expect)(page.locator('h1')).toBeVisible();
            await (0, test_1.expect)(page.locator('input[placeholder*="Search"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('button:has-text("Create Template")')).toBeVisible();
            const templates = page.locator('[data-testid="template-card"]');
            const count = await templates.count();
            if (count > 1) {
                const firstTemplate = await templates.first().boundingBox();
                const secondTemplate = await templates.nth(1).boundingBox();
                if (firstTemplate && secondTemplate) {
                    (0, test_1.expect)(secondTemplate.y).toBeGreaterThan(firstTemplate.y + firstTemplate.height - 50);
                }
            }
        });
        (0, test_1.test)('should be keyboard accessible', async ({ page }) => {
            await navigateToTemplatesLibrary(page);
            await page.keyboard.press('Tab');
            await (0, test_1.expect)(page.locator('input[placeholder*="Search"]')).toBeFocused();
            await page.keyboard.press('Tab');
            await page.keyboard.press('Tab');
            const templates = page.locator('[data-testid="template-card"]');
            const count = await templates.count();
            if (count > 0) {
                await page.keyboard.press('Tab');
                await page.keyboard.press('Tab');
                await page.keyboard.press('Tab');
                await page.keyboard.press('Enter');
                await (0, test_1.expect)(page.locator('[role="dialog"]')).toBeVisible();
                await page.keyboard.press('Escape');
                await (0, test_1.expect)(page.locator('[role="dialog"]')).toBeHidden();
            }
        });
        (0, test_1.test)('should have proper ARIA labels and roles', async ({ page }) => {
            await navigateToTemplatesLibrary(page);
            await (0, test_1.expect)(page.locator('button[aria-label*="Create"]').or(page.locator('button:has-text("Create Template")'))).toBeVisible();
            await (0, test_1.expect)(page.locator('[role="main"]').or(page.locator('main'))).toBeVisible();
            const templates = page.locator('[data-testid="template-card"]');
            const count = await templates.count();
            if (count > 0) {
                const firstTemplate = templates.first();
                await (0, test_1.expect)(firstTemplate).toHaveAttribute('role', /button|link|article/);
                const templateText = await firstTemplate.textContent();
                (0, test_1.expect)(templateText?.length).toBeGreaterThan(10);
            }
        });
    });
    test_1.test.describe('Error Handling and Edge Cases', () => {
        (0, test_1.test)('should handle network errors gracefully', async ({ page }) => {
            await page.route('/api/allocation-templates*', route => {
                route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Internal server error' })
                });
            });
            await navigateToTemplatesLibrary(page);
            await (0, test_1.expect)(page.locator('text*="error"').or(page.locator('text*="Error"'))).toBeVisible();
            await (0, test_1.expect)(page.locator('button:has-text("Try Again")')).toBeVisible();
        });
        (0, test_1.test)('should handle empty state correctly', async ({ page }) => {
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
            await (0, test_1.expect)(page.locator('text*="No templates found"')).toBeVisible();
            await (0, test_1.expect)(page.locator('text*="create a new template"')).toBeVisible();
        });
        (0, test_1.test)('should handle loading states correctly', async ({ page }) => {
            await page.route('/api/allocation-templates*', async (route) => {
                await page.waitForTimeout(2000);
                const response = await page.request.fetch(route.request());
                route.fulfill({ response });
            });
            await navigateToTemplatesLibrary(page);
            await (0, test_1.expect)(page.locator('[class*="animate-pulse"]').or(page.locator('[class*="loading"]'))).toBeVisible();
            await (0, test_1.expect)(page.locator('[class*="animate-pulse"]').or(page.locator('[class*="loading"]'))).toBeHidden({ timeout: 10000 });
        });
        (0, test_1.test)('should handle very long template names and descriptions', async ({ page }) => {
            const longTemplateData = {
                name: 'Very Long Template Name That Should Be Truncated Properly Because It Exceeds Normal Display Limits',
                description: 'This is an extremely long description that should test how the UI handles overflow text and ensures that the layout remains intact even when dealing with unusually long content that might break normal text flow and styling.',
                category: 'custom',
                tags: ['very-long-tag-name-that-should-also-be-handled-properly'],
                duration: '24'
            };
            await navigateToTemplatesLibrary(page);
            await createTemplate(page, longTemplateData);
            await addRoleToTemplate(page, ROLE_DATA.frontend);
            await page.click('button[role="tab"]:has-text("Review")');
            await page.click('button:has-text("Create Template")');
            await page.fill('input[placeholder*="Search templates"]', 'Very Long Template');
            await page.waitForLoadState('networkidle');
            const templateCard = page.locator('text*="Very Long Template"').first();
            await (0, test_1.expect)(templateCard).toBeVisible();
            const cardElement = page.locator('[data-testid="template-card"]').first();
            const boundingBox = await cardElement.boundingBox();
            if (boundingBox) {
                (0, test_1.expect)(boundingBox.width).toBeLessThan(800);
            }
        });
    });
    test_1.test.describe('Performance and Load Testing', () => {
        (0, test_1.test)('should handle large number of templates', async ({ page }) => {
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
                        templates: manyTemplates.slice(0, 20),
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
            await (0, test_1.expect)(page.locator('[data-testid="template-card"]')).toHaveCount(20);
            await (0, test_1.expect)(page.locator('text*="50 templates found"')).toBeVisible();
        });
        (0, test_1.test)('should maintain performance during search operations', async ({ page }) => {
            await navigateToTemplatesLibrary(page);
            const searchInput = page.locator('input[placeholder*="Search templates"]');
            const startTime = Date.now();
            await searchInput.fill('web');
            await page.waitForLoadState('networkidle');
            const endTime = Date.now();
            const searchTime = endTime - startTime;
            (0, test_1.expect)(searchTime).toBeLessThan(5000);
            await searchInput.clear();
            await page.waitForLoadState('networkidle');
            await (0, test_1.expect)(page.locator('[data-testid="template-card"]').or(page.locator('text*="templates found"'))).toBeVisible();
        });
    });
    test_1.test.afterEach(async ({ page }) => {
        await page.evaluate(() => {
            const testNames = [
                'E2E Web Development Template',
                'E2E Mobile App Template',
                'Very Long Template Name',
                'API Test Template'
            ];
            return Promise.resolve();
        });
    });
});
//# sourceMappingURL=allocation-templates.spec.js.map
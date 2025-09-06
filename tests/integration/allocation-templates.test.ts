import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import { DatabaseService } from '../../src/database/database.service';
import { AllocationTemplatesService } from '../../src/services/allocation-templates.service';
import request from 'supertest';
import express from 'express';
import allocationTemplatesRoutes from '../../src/routes/allocation-templates.routes';

// Test app setup
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.headers['user-id'] = 'test-user-id';
  next();
});
app.use('/api/allocation-templates', allocationTemplatesRoutes);

describe('Allocation Templates Integration Tests', () => {
  let db: DatabaseService;
  let templatesService: AllocationTemplatesService;
  let testEmployeeId: string;
  let testProjectId: number;
  let testTemplateId: string;

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    templatesService = new AllocationTemplatesService();
    
    // Create test employee if doesn't exist
    try {
      const employeeResult = await db.query(`
        INSERT INTO employees (id, first_name, last_name, email, position, department_id, status)
        VALUES (gen_random_uuid(), 'Test', 'User', 'test@example.com', 'Developer', 
                (SELECT id FROM departments LIMIT 1), 'active')
        RETURNING id
      `);
      testEmployeeId = employeeResult.rows[0].id;
    } catch (error) {
      // Employee might already exist, get existing
      const existingEmployee = await db.query(`
        SELECT id FROM employees WHERE email = 'test@example.com' LIMIT 1
      `);
      testEmployeeId = existingEmployee.rows[0]?.id || 'default-user-id';
    }

    // Create test project
    try {
      const projectResult = await db.query(`
        INSERT INTO projects (name, description, start_date, status)
        VALUES ('Test Project', 'Test project for template application', CURRENT_DATE, 'planning')
        RETURNING id
      `);
      testProjectId = projectResult.rows[0].id;
    } catch (error) {
      console.error('Error creating test project:', error);
    }
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      if (testTemplateId) {
        await db.query('DELETE FROM allocation_templates WHERE id = $1', [testTemplateId]);
      }
      if (testProjectId) {
        await db.query('DELETE FROM projects WHERE id = $1', [testProjectId]);
      }
      if (testEmployeeId && testEmployeeId !== 'default-user-id') {
        await db.query('DELETE FROM employees WHERE id = $1', [testEmployeeId]);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  beforeEach(async () => {
    // Clean up any existing test templates
    await db.query(`
      DELETE FROM allocation_templates 
      WHERE name LIKE 'Test Template%' OR name LIKE '%Test%'
    `);
  });

  describe('Template CRUD Operations', () => {
    it('should create a new allocation template', async () => {
      const templateData = {
        name: 'Test Web Development Template',
        description: 'A test template for web development projects',
        category: 'web_development',
        tags: ['test', 'web', 'javascript'],
        visibility: 'private',
        default_duration_weeks: 12,
        default_budget_range: [10000, 50000],
        default_priority: 'medium'
      };

      const template = await templatesService.createTemplate(templateData, testEmployeeId);
      testTemplateId = template.id;

      expect(template).toBeDefined();
      expect(template.name).toBe(templateData.name);
      expect(template.category).toBe(templateData.category);
      expect(template.created_by).toBe(testEmployeeId);
      expect(template.visibility).toBe(templateData.visibility);
      expect(template.tags).toEqual(templateData.tags);
    });

    it('should fail to create template with invalid data', async () => {
      const invalidTemplateData = {
        name: 'Te', // Too short
        description: 'Invalid template',
        category: 'web_development',
        default_duration_weeks: -5 // Invalid duration
      };

      await expect(
        templatesService.createTemplate(invalidTemplateData as any, testEmployeeId)
      ).rejects.toThrow();
    });

    it('should retrieve templates with filtering', async () => {
      // Create test template first
      const template = await templatesService.createTemplate({
        name: 'Test Mobile App Template',
        description: 'Template for mobile app development',
        category: 'mobile_app',
        tags: ['mobile', 'react-native'],
        visibility: 'public',
        default_duration_weeks: 16
      }, testEmployeeId);

      const filters = {
        category: 'mobile_app',
        search: 'mobile',
        visibility: 'public'
      };

      const result = await templatesService.getTemplates(filters, testEmployeeId, {
        page: 1,
        limit: 10
      });

      expect(result.templates).toBeDefined();
      expect(result.templates.length).toBeGreaterThan(0);
      expect(result.templates.some(t => t.category === 'mobile_app')).toBe(true);
    });

    it('should retrieve template by ID with full details', async () => {
      // Create template with role
      const template = await templatesService.createTemplate({
        name: 'Test Detailed Template',
        description: 'Template with roles for testing',
        category: 'web_development',
        visibility: 'private'
      }, testEmployeeId);

      // Add a role to the template
      const role = await templatesService.addTemplateRole(template.id, {
        role_name: 'Frontend Developer',
        description: 'React frontend development',
        planned_allocation_percentage: 80,
        estimated_hours_per_week: 32,
        duration_weeks: 10,
        minimum_experience_level: 'mid',
        is_critical: true,
        can_be_remote: true
      }, testEmployeeId);

      const detailedTemplate = await templatesService.getTemplateById(template.id, testEmployeeId);

      expect(detailedTemplate).toBeDefined();
      expect(detailedTemplate.roles).toBeDefined();
      expect(detailedTemplate.roles.length).toBe(1);
      expect(detailedTemplate.roles[0].role_name).toBe('Frontend Developer');
      expect(detailedTemplate.usage_stats).toBeDefined();
    });

    it('should update template metadata', async () => {
      const template = await templatesService.createTemplate({
        name: 'Test Update Template',
        description: 'Original description',
        category: 'custom',
        visibility: 'private'
      }, testEmployeeId);

      const updateData = {
        description: 'Updated description',
        default_duration_weeks: 8,
        tags: ['updated', 'test']
      };

      const updatedTemplate = await templatesService.updateTemplate(
        template.id, 
        updateData, 
        testEmployeeId
      );

      expect(updatedTemplate.description).toBe(updateData.description);
      expect(updatedTemplate.default_duration_weeks).toBe(updateData.default_duration_weeks);
      expect(updatedTemplate.tags).toEqual(updateData.tags);
    });

    it('should soft delete template', async () => {
      const template = await templatesService.createTemplate({
        name: 'Test Delete Template',
        description: 'Template to be deleted',
        category: 'custom',
        visibility: 'private'
      }, testEmployeeId);

      await templatesService.deleteTemplate(template.id, testEmployeeId);

      // Template should not be accessible anymore
      await expect(
        templatesService.getTemplateById(template.id, testEmployeeId)
      ).rejects.toThrow('Template not found or access denied');
    });
  });

  describe('Template Role Management', () => {
    let templateId: string;

    beforeEach(async () => {
      const template = await templatesService.createTemplate({
        name: 'Test Role Template',
        description: 'Template for role testing',
        category: 'web_development',
        visibility: 'private'
      }, testEmployeeId);
      templateId = template.id;
    });

    it('should add role to template', async () => {
      const roleData = {
        role_name: 'Backend Developer',
        description: 'Node.js API development',
        planned_allocation_percentage: 75,
        estimated_hours_per_week: 30,
        duration_weeks: 12,
        minimum_experience_level: 'senior' as const,
        hourly_rate_range: [80, 120] as [number, number],
        is_critical: true,
        can_be_remote: false,
        max_assignments: 1
      };

      const role = await templatesService.addTemplateRole(templateId, roleData, testEmployeeId);

      expect(role).toBeDefined();
      expect(role.role_name).toBe(roleData.role_name);
      expect(role.planned_allocation_percentage).toBe(roleData.planned_allocation_percentage);
      expect(role.hourly_rate_range).toEqual(roleData.hourly_rate_range);
    });

    it('should validate role allocation percentage', async () => {
      const invalidRoleData = {
        role_name: 'Invalid Role',
        planned_allocation_percentage: 150, // Invalid - over 100%
        minimum_experience_level: 'junior' as const
      };

      await expect(
        templatesService.addTemplateRole(templateId, invalidRoleData as any, testEmployeeId)
      ).rejects.toThrow();
    });
  });

  describe('Template Application to Projects', () => {
    let templateId: string;

    beforeEach(async () => {
      // Create template with roles
      const template = await templatesService.createTemplate({
        name: 'Test Application Template',
        description: 'Template for project application testing',
        category: 'web_development',
        visibility: 'private',
        default_duration_weeks: 10
      }, testEmployeeId);
      
      templateId = template.id;

      // Add roles to template
      await templatesService.addTemplateRole(templateId, {
        role_name: 'Full Stack Developer',
        description: 'Full stack development',
        planned_allocation_percentage: 80,
        estimated_hours_per_week: 32,
        duration_weeks: 10,
        minimum_experience_level: 'mid',
        is_critical: true
      }, testEmployeeId);

      await templatesService.addTemplateRole(templateId, {
        role_name: 'UI/UX Designer',
        description: 'User interface design',
        planned_allocation_percentage: 50,
        estimated_hours_per_week: 20,
        duration_weeks: 8,
        minimum_experience_level: 'mid',
        is_critical: false
      }, testEmployeeId);
    });

    it('should apply template to project', async () => {
      const applicationOptions = {
        project_id: testProjectId,
        start_date: '2025-01-01',
        scale_duration: 1.2 // 20% longer duration
      };

      const result = await templatesService.applyTemplateToProject(
        templateId, 
        applicationOptions, 
        testEmployeeId
      );

      expect(result).toBeDefined();
      expect(result.project_id).toBe(testProjectId);
      expect(result.roles_created).toBeDefined();
      expect(result.roles_created.length).toBe(2);
      expect(result.template_applied).toBe('Test Application Template');

      // Verify roles were created in project
      const projectRoles = await db.query(
        'SELECT * FROM project_roles WHERE project_id = $1',
        [testProjectId]
      );
      
      expect(projectRoles.rows.length).toBeGreaterThanOrEqual(2);
    });

    it('should apply template with role skipping', async () => {
      const applicationOptions = {
        project_id: testProjectId,
        start_date: '2025-01-01',
        skip_roles: ['UI/UX Designer'] // Skip the designer role
      };

      const result = await templatesService.applyTemplateToProject(
        templateId, 
        applicationOptions, 
        testEmployeeId
      );

      expect(result.roles_created.length).toBe(1);
      expect(result.roles_created[0].role_name).toBe('Full Stack Developer');
    });

    it('should update template usage statistics after application', async () => {
      const initialTemplate = await templatesService.getTemplateById(templateId, testEmployeeId);
      const initialUsageCount = initialTemplate.usage_count;

      await templatesService.applyTemplateToProject(templateId, {
        project_id: testProjectId,
        start_date: '2025-01-01'
      }, testEmployeeId);

      const updatedTemplate = await templatesService.getTemplateById(templateId, testEmployeeId);
      expect(updatedTemplate.usage_count).toBe(initialUsageCount + 1);
      expect(updatedTemplate.last_used_at).toBeDefined();
    });
  });

  describe('Template Cloning', () => {
    it('should clone template with all roles', async () => {
      // Create original template
      const original = await templatesService.createTemplate({
        name: 'Original Template',
        description: 'Template to be cloned',
        category: 'data_analytics',
        visibility: 'private',
        tags: ['analytics', 'python']
      }, testEmployeeId);

      // Add role to original
      await templatesService.addTemplateRole(original.id, {
        role_name: 'Data Scientist',
        description: 'Data analysis and ML',
        planned_allocation_percentage: 90,
        estimated_hours_per_week: 36,
        duration_weeks: 8,
        minimum_experience_level: 'senior',
        is_critical: true
      }, testEmployeeId);

      // Clone template
      const cloned = await templatesService.cloneTemplate(
        original.id, 
        'Cloned Analytics Template', 
        testEmployeeId
      );

      expect(cloned).toBeDefined();
      expect(cloned.name).toBe('Cloned Analytics Template');
      expect(cloned.description).toBe(original.description);
      expect(cloned.category).toBe(original.category);
      expect(cloned.visibility).toBe('private'); // Clones are always private initially
      expect(cloned.parent_template_id).toBe(original.id);
      expect(cloned.roles.length).toBe(1);
      expect(cloned.roles[0].role_name).toBe('Data Scientist');
    });
  });

  describe('Template Library Features', () => {
    it('should retrieve popular templates', async () => {
      // Create templates with different usage counts
      const popularTemplate = await templatesService.createTemplate({
        name: 'Popular Template',
        description: 'Highly used template',
        category: 'web_development',
        visibility: 'public'
      }, testEmployeeId);

      // Simulate usage by updating usage count directly
      await db.query(
        'UPDATE allocation_templates SET usage_count = 10, last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
        [popularTemplate.id]
      );

      const popularTemplates = await templatesService.getPopularTemplates(5);

      expect(popularTemplates).toBeDefined();
      expect(popularTemplates.length).toBeGreaterThan(0);
      expect(popularTemplates.some(t => t.name === 'Popular Template')).toBe(true);
    });

    it('should retrieve template categories with statistics', async () => {
      // Create templates in different categories
      await templatesService.createTemplate({
        name: 'DevOps Template 1',
        category: 'devops',
        visibility: 'public'
      }, testEmployeeId);

      await templatesService.createTemplate({
        name: 'DevOps Template 2',
        category: 'devops',
        visibility: 'public'
      }, testEmployeeId);

      const categories = await templatesService.getTemplateCategories();

      expect(categories).toBeDefined();
      expect(categories.length).toBeGreaterThan(0);
      expect(categories.some(c => c.category === 'devops')).toBe(true);
    });
  });

  describe('Template Rating System', () => {
    it('should rate template after usage', async () => {
      const template = await templatesService.createTemplate({
        name: 'Rateable Template',
        description: 'Template for rating tests',
        category: 'consulting',
        visibility: 'private'
      }, testEmployeeId);

      // Apply template to project first
      await templatesService.applyTemplateToProject(template.id, {
        project_id: testProjectId,
        start_date: '2025-01-01'
      }, testEmployeeId);

      // Rate the template
      await templatesService.rateTemplate(template.id, testProjectId, 5, 'Excellent template!', testEmployeeId);

      // Verify rating was recorded
      const usageHistory = await db.query(
        'SELECT success_rating, feedback FROM template_usage_history WHERE template_id = $1 AND project_id = $2',
        [template.id, testProjectId]
      );

      expect(usageHistory.rows.length).toBe(1);
      expect(usageHistory.rows[0].success_rating).toBe(5);
      expect(usageHistory.rows[0].feedback).toBe('Excellent template!');
    });

    it('should validate rating values', async () => {
      const template = await templatesService.createTemplate({
        name: 'Invalid Rating Template',
        category: 'custom',
        visibility: 'private'
      }, testEmployeeId);

      await templatesService.applyTemplateToProject(template.id, {
        project_id: testProjectId,
        start_date: '2025-01-01'
      }, testEmployeeId);

      // Test invalid rating (outside 1-5 range)
      await expect(
        templatesService.rateTemplate(template.id, testProjectId, 10, 'Invalid rating', testEmployeeId)
      ).rejects.toThrow('Rating must be between 1 and 5');
    });
  });

  describe('API Endpoints', () => {
    it('should handle GET /api/allocation-templates', async () => {
      const response = await request(app)
        .get('/api/allocation-templates')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.templates).toBeDefined();
      expect(response.body.pagination).toBeDefined();
    });

    it('should handle POST /api/allocation-templates', async () => {
      const templateData = {
        name: 'API Test Template',
        description: 'Template created via API',
        category: 'web_development',
        visibility: 'private',
        tags: ['api', 'test']
      };

      const response = await request(app)
        .post('/api/allocation-templates')
        .send(templateData)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.name).toBe(templateData.name);
      expect(response.body.category).toBe(templateData.category);

      // Clean up
      testTemplateId = response.body.id;
    });

    it('should handle GET /api/allocation-templates/:id', async () => {
      // Create template first
      const template = await templatesService.createTemplate({
        name: 'API Detail Test Template',
        category: 'mobile_app',
        visibility: 'private'
      }, testEmployeeId);

      const response = await request(app)
        .get(`/api/allocation-templates/${template.id}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(template.id);
      expect(response.body.name).toBe('API Detail Test Template');
    });

    it('should handle template application via API', async () => {
      // Create template with role
      const template = await templatesService.createTemplate({
        name: 'API Application Template',
        category: 'web_development',
        visibility: 'private'
      }, testEmployeeId);

      await templatesService.addTemplateRole(template.id, {
        role_name: 'API Developer',
        planned_allocation_percentage: 70,
        estimated_hours_per_week: 28,
        duration_weeks: 6,
        minimum_experience_level: 'mid'
      }, testEmployeeId);

      const applicationData = {
        project_id: testProjectId,
        start_date: '2025-02-01'
      };

      const response = await request(app)
        .post(`/api/allocation-templates/${template.id}/apply`)
        .send(applicationData)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.project_id).toBe(testProjectId);
      expect(response.body.roles_created).toBeDefined();
      expect(response.body.roles_created.length).toBe(1);
    });

    it('should handle validation errors appropriately', async () => {
      const invalidData = {
        name: 'A', // Too short
        category: 'invalid_category'
      };

      const response = await request(app)
        .post('/api/allocation-templates')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle template cloning via API', async () => {
      const template = await templatesService.createTemplate({
        name: 'API Clone Source',
        category: 'consulting',
        visibility: 'private'
      }, testEmployeeId);

      const response = await request(app)
        .post(`/api/allocation-templates/${template.id}/clone`)
        .send({ name: 'API Cloned Template' })
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.name).toBe('API Cloned Template');
      expect(response.body.parent_template_id).toBe(template.id);
    });

    it('should handle popular templates endpoint', async () => {
      const response = await request(app)
        .get('/api/allocation-templates/popular?limit=5')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should handle categories endpoint', async () => {
      const response = await request(app)
        .get('/api/allocation-templates/categories')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Access Control', () => {
    let otherEmployeeId: string;

    beforeAll(async () => {
      // Create another test employee
      try {
        const employeeResult = await db.query(`
          INSERT INTO employees (id, first_name, last_name, email, position, department_id, status)
          VALUES (gen_random_uuid(), 'Other', 'User', 'other@example.com', 'Designer', 
                  (SELECT id FROM departments LIMIT 1), 'active')
          RETURNING id
        `);
        otherEmployeeId = employeeResult.rows[0].id;
      } catch (error) {
        // Use fallback ID
        otherEmployeeId = 'other-user-id';
      }
    });

    afterAll(async () => {
      if (otherEmployeeId && otherEmployeeId !== 'other-user-id') {
        await db.query('DELETE FROM employees WHERE id = $1', [otherEmployeeId]);
      }
    });

    it('should restrict access to private templates', async () => {
      const privateTemplate = await templatesService.createTemplate({
        name: 'Private Template',
        category: 'custom',
        visibility: 'private'
      }, testEmployeeId);

      // Other user should not be able to access it
      await expect(
        templatesService.getTemplateById(privateTemplate.id, otherEmployeeId)
      ).rejects.toThrow('Template not found or access denied');
    });

    it('should allow access to public templates', async () => {
      const publicTemplate = await templatesService.createTemplate({
        name: 'Public Template',
        category: 'custom',
        visibility: 'public'
      }, testEmployeeId);

      // Other user should be able to access it
      const template = await templatesService.getTemplateById(publicTemplate.id, otherEmployeeId);
      expect(template).toBeDefined();
      expect(template.name).toBe('Public Template');
    });

    it('should prevent unauthorized template modification', async () => {
      const template = await templatesService.createTemplate({
        name: 'Protected Template',
        category: 'custom',
        visibility: 'private'
      }, testEmployeeId);

      // Other user should not be able to update it
      await expect(
        templatesService.updateTemplate(template.id, { description: 'Hacked!' }, otherEmployeeId)
      ).rejects.toThrow();
    });

    it('should prevent unauthorized template deletion', async () => {
      const template = await templatesService.createTemplate({
        name: 'Protected Delete Template',
        category: 'custom',
        visibility: 'private'
      }, testEmployeeId);

      // Other user should not be able to delete it
      await expect(
        templatesService.deleteTemplate(template.id, otherEmployeeId)
      ).rejects.toThrow();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle templates with many roles', async () => {
      const template = await templatesService.createTemplate({
        name: 'Large Template',
        category: 'web_development',
        visibility: 'private'
      }, testEmployeeId);

      // Add multiple roles
      const rolePromises = Array.from({ length: 10 }, (_, i) =>
        templatesService.addTemplateRole(template.id, {
          role_name: `Role ${i + 1}`,
          description: `Role description ${i + 1}`,
          planned_allocation_percentage: 10,
          estimated_hours_per_week: 4,
          duration_weeks: 5,
          minimum_experience_level: 'junior',
          display_order: i
        }, testEmployeeId)
      );

      await Promise.all(rolePromises);

      const fullTemplate = await templatesService.getTemplateById(template.id, testEmployeeId);
      expect(fullTemplate.roles.length).toBe(10);
      expect(fullTemplate.roles.every(role => role.role_name.startsWith('Role'))).toBe(true);
    });

    it('should handle concurrent template operations', async () => {
      const templatePromises = Array.from({ length: 5 }, (_, i) =>
        templatesService.createTemplate({
          name: `Concurrent Template ${i + 1}`,
          category: 'custom',
          visibility: 'private'
        }, testEmployeeId)
      );

      const templates = await Promise.all(templatePromises);
      expect(templates.length).toBe(5);
      expect(templates.every(t => t.name.startsWith('Concurrent Template'))).toBe(true);

      // Clean up
      await Promise.all(
        templates.map(t => templatesService.deleteTemplate(t.id, testEmployeeId))
      );
    });

    it('should handle invalid template IDs gracefully', async () => {
      await expect(
        templatesService.getTemplateById('invalid-uuid', testEmployeeId)
      ).rejects.toThrow();

      await expect(
        templatesService.updateTemplate('invalid-uuid', { name: 'Updated' }, testEmployeeId)
      ).rejects.toThrow();

      await expect(
        templatesService.deleteTemplate('invalid-uuid', testEmployeeId)
      ).rejects.toThrow();
    });

    it('should handle pagination correctly', async () => {
      // Create multiple templates
      const templatePromises = Array.from({ length: 15 }, (_, i) =>
        templatesService.createTemplate({
          name: `Pagination Template ${i + 1}`,
          category: 'custom',
          visibility: 'private'
        }, testEmployeeId)
      );

      await Promise.all(templatePromises);

      // Test pagination
      const page1 = await templatesService.getTemplates({}, testEmployeeId, {
        page: 1,
        limit: 10
      });

      const page2 = await templatesService.getTemplates({}, testEmployeeId, {
        page: 2,
        limit: 10
      });

      expect(page1.templates.length).toBe(10);
      expect(page2.templates.length).toBeGreaterThan(0);
      expect(page1.pagination.currentPage).toBe(1);
      expect(page2.pagination.currentPage).toBe(2);

      // Clean up
      const allTemplates = [...page1.templates, ...page2.templates]
        .filter(t => t.name.startsWith('Pagination Template'));
      
      await Promise.all(
        allTemplates.map(t => templatesService.deleteTemplate(t.id, testEmployeeId))
      );
    });
  });
});
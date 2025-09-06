import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app';
import { DatabaseService } from '../../src/database/database.service';
import { RoleTemplatesService } from '../../src/services/role-templates.service';

describe('Role Templates API', () => {
  let db: DatabaseService;
  let roleTemplatesService: RoleTemplatesService;

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    roleTemplatesService = new RoleTemplatesService();
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await db.query('DELETE FROM project_template_assignments WHERE template_id >= 9000');
    await db.query('DELETE FROM role_template_skills WHERE template_id >= 9000');
    await db.query('DELETE FROM role_templates WHERE id >= 9000');
    await db.query('DELETE FROM projects WHERE id >= 9000');
  });

  describe('POST /api/role-templates', () => {
    it('should create a new role template with skills and requirements', async () => {
      const templateData = {
        name: 'Senior Full Stack Developer',
        description: 'Experienced developer for complex web applications',
        department: 'Engineering',
        level: 'Senior',
        requiredSkills: [
          { skillId: 1, minProficiency: 4, isRequired: true },
          { skillId: 2, minProficiency: 3, isRequired: true }
        ],
        preferredSkills: [
          { skillId: 3, minProficiency: 3, isRequired: false }
        ],
        estimatedSalaryRange: {
          min: 80000,
          max: 120000
        },
        standardHourlyRate: 85,
        responsibilities: [
          'Lead development of complex features',
          'Mentor junior developers',
          'Review code and architecture decisions'
        ]
      };

      const response = await request(app)
        .post('/api/role-templates')
        .send(templateData)
        .expect(201);

      expect(response.body).toMatchObject({
        name: templateData.name,
        description: templateData.description,
        department: templateData.department,
        level: templateData.level
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.requiredSkills).toHaveLength(2);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/role-templates')
        .send({})
        .expect(400);

      expect(response.body.message).toContain('name is required');
    });
  });

  describe('GET /api/role-templates', () => {
    it('should return role templates with filtering', async () => {
      // Create test templates
      await db.query(`
        INSERT INTO role_templates (id, name, description, department, level, standard_hourly_rate, is_active) VALUES
        (9001, 'Junior Developer', 'Entry level developer', 'Engineering', 'Junior', 45, true),
        (9002, 'Senior Developer', 'Senior level developer', 'Engineering', 'Senior', 85, true),
        (9003, 'Product Manager', 'Product management role', 'Product', 'Mid', 75, true)
      `);

      const response = await request(app)
        .get('/api/role-templates?department=Engineering&level=Senior')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Senior Developer');
    });
  });

  describe('POST /api/projects/:id/apply-template', () => {
    it('should apply role template to project with placeholder resources', async () => {
      // Create test project and template
      await db.query(`
        INSERT INTO projects (id, name, description, start_date, end_date, status, budget, created_by)
        VALUES (9001, 'Test Project', 'Test Description', '2024-01-01', '2024-12-31', 'planning', 100000, 1)
      `);
      await db.query(`
        INSERT INTO role_templates (id, name, description, department, level, standard_hourly_rate, is_active)
        VALUES (9001, 'Full Stack Developer', 'Full stack role', 'Engineering', 'Mid', 65, true)
      `);

      const templateApplication = {
        templateId: 9001,
        quantity: 2,
        startDate: '2024-02-01',
        endDate: '2024-11-30',
        allocation: 100,
        customizations: {
          hourlyRate: 70,
          specificRequirements: 'React experience preferred'
        }
      };

      const response = await request(app)
        .post('/api/projects/9001/apply-template')
        .send(templateApplication)
        .expect(201);

      expect(response.body.placeholderResources).toHaveLength(2);
      expect(response.body.placeholderResources[0]).toMatchObject({
        projectId: 9001,
        templateId: 9001,
        allocation: 100,
        isPlaceholder: true
      });
    });
  });

  describe('GET /api/role-templates/:id/match-employees', () => {
    it('should find employees matching template requirements', async () => {
      // Create test template
      await db.query(`
        INSERT INTO role_templates (id, name, description, department, level, standard_hourly_rate, is_active)
        VALUES (9002, 'React Developer', 'React specialist', 'Engineering', 'Mid', 60, true)
      `);
      
      const response = await request(app)
        .get('/api/role-templates/9002/match-employees')
        .expect(200);

      expect(response.body).toHaveProperty('matches');
      expect(Array.isArray(response.body.matches)).toBe(true);
      
      if (response.body.matches.length > 0) {
        const match = response.body.matches[0];
        expect(match).toHaveProperty('employee');
        expect(match).toHaveProperty('matchScore');
        expect(match).toHaveProperty('skillMatches');
      }
    });
  });

  describe('GET /api/role-templates/library', () => {
    it('should return template library with categories', async () => {
      const response = await request(app)
        .get('/api/role-templates/library')
        .expect(200);

      expect(response.body).toHaveProperty('categories');
      expect(response.body).toHaveProperty('popularTemplates');
      expect(response.body).toHaveProperty('recentTemplates');
      expect(Array.isArray(response.body.categories)).toBe(true);
    });
  });

  describe('PUT /api/role-templates/:id', () => {
    it('should update role template', async () => {
      await db.query(`
        INSERT INTO role_templates (id, name, description, department, level, standard_hourly_rate, is_active)
        VALUES (9003, 'Original Name', 'Original description', 'Engineering', 'Mid', 60, true)
      `);

      const updates = {
        name: 'Updated Role Name',
        description: 'Updated description',
        standardHourlyRate: 65
      };

      const response = await request(app)
        .put('/api/role-templates/9003')
        .send(updates)
        .expect(200);

      expect(response.body).toMatchObject(updates);
    });
  });

  describe('POST /api/role-templates/:id/clone', () => {
    it('should clone existing template with modifications', async () => {
      await db.query(`
        INSERT INTO role_templates (id, name, description, department, level, standard_hourly_rate, is_active)
        VALUES (9004, 'Original Template', 'Original description', 'Engineering', 'Mid', 60, true)
      `);

      const cloneData = {
        name: 'Cloned Template',
        modifications: {
          level: 'Senior',
          standardHourlyRate: 80
        }
      };

      const response = await request(app)
        .post('/api/role-templates/9004/clone')
        .send(cloneData)
        .expect(201);

      expect(response.body.name).toBe('Cloned Template');
      expect(response.body.level).toBe('Senior');
      expect(response.body.standardHourlyRate).toBe(80);
      expect(response.body.id).not.toBe(9004);
    });
  });
});
import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app';
import { DatabaseService } from '../../src/database/database.service';
import { SkillsManagementService } from '../../src/services/skills-management.service';

describe('Skills Management API', () => {
  let db: DatabaseService;
  let skillsService: SkillsManagementService;

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    skillsService = new SkillsManagementService();
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await db.query('DELETE FROM employee_skills WHERE employee_id >= 9000');
    await db.query('DELETE FROM skills WHERE id >= 9000');
    await db.query('DELETE FROM employees WHERE id >= 9000');
  });

  describe('POST /api/skills', () => {
    it('should create a new skill with category and description', async () => {
      const skillData = {
        name: 'Advanced React Testing',
        category: 'Technical',
        description: 'Advanced testing techniques for React applications',
        isActive: true
      };

      const response = await request(app)
        .post('/api/skills')
        .send(skillData)
        .expect(201);

      expect(response.body).toMatchObject({
        name: skillData.name,
        category: skillData.category,
        description: skillData.description,
        isActive: true
      });
      expect(response.body.id).toBeDefined();
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/skills')
        .send({})
        .expect(400);

      expect(response.body.message).toContain('name is required');
    });
  });

  describe('GET /api/skills', () => {
    it('should return skills with filtering and pagination', async () => {
      // Create test skills
      await db.query(`
        INSERT INTO skills (id, name, category, description, is_active) VALUES
        (9001, 'React', 'Technical', 'React library', true),
        (9002, 'Node.js', 'Technical', 'Node.js runtime', true),
        (9003, 'Leadership', 'Soft', 'Team leadership skills', true)
      `);

      const response = await request(app)
        .get('/api/skills?category=Technical&limit=2')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((skill: any) => skill.category === 'Technical')).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });
  });

  describe('POST /api/employees/:id/skills', () => {
    it('should assign skill to employee with proficiency level', async () => {
      // Create test employee and skill
      await db.query(`
        INSERT INTO employees (id, first_name, last_name, email, position, department_id, hire_date, salary, is_active)
        VALUES (9001, 'Test', 'Employee', 'test@example.com', 'Developer', 1, '2024-01-01', 50000, true)
      `);
      await db.query(`
        INSERT INTO skills (id, name, category, description, is_active)
        VALUES (9001, 'React', 'Technical', 'React library', true)
      `);

      const skillAssignment = {
        skillId: 9001,
        proficiencyLevel: 4,
        certificationLevel: 'Advanced',
        lastUsed: '2024-01-01',
        yearsOfExperience: 3
      };

      const response = await request(app)
        .post('/api/employees/9001/skills')
        .send(skillAssignment)
        .expect(201);

      expect(response.body).toMatchObject({
        employeeId: 9001,
        skillId: 9001,
        proficiencyLevel: 4,
        certificationLevel: 'Advanced'
      });
    });

    it('should validate proficiency level range (1-5)', async () => {
      await db.query(`
        INSERT INTO employees (id, first_name, last_name, email, position, department_id, hire_date, salary, is_active)
        VALUES (9002, 'Test', 'Employee', 'test2@example.com', 'Developer', 1, '2024-01-01', 50000, true)
      `);

      const response = await request(app)
        .post('/api/employees/9002/skills')
        .send({ skillId: 9001, proficiencyLevel: 6 })
        .expect(400);

      expect(response.body.message).toContain('proficiency level must be between 1 and 5');
    });
  });

  describe('GET /api/employees/:id/skills/gap-analysis', () => {
    it('should return skill gaps for employee role', async () => {
      // Setup test data
      await db.query(`
        INSERT INTO employees (id, first_name, last_name, email, position, department_id, hire_date, salary, is_active)
        VALUES (9003, 'Test', 'Developer', 'dev@example.com', 'Senior Developer', 1, '2024-01-01', 70000, true)
      `);

      const response = await request(app)
        .get('/api/employees/9003/skills/gap-analysis')
        .expect(200);

      expect(response.body).toHaveProperty('missingSkills');
      expect(response.body).toHaveProperty('skillsToImprove');
      expect(response.body).toHaveProperty('recommendations');
      expect(Array.isArray(response.body.missingSkills)).toBe(true);
    });
  });

  describe('GET /api/skills/analytics', () => {
    it('should return comprehensive skill analytics', async () => {
      const response = await request(app)
        .get('/api/skills/analytics')
        .expect(200);

      expect(response.body).toHaveProperty('skillDistribution');
      expect(response.body).toHaveProperty('proficiencyLevels');
      expect(response.body).toHaveProperty('skillsByCategory');
      expect(response.body).toHaveProperty('emergingSkills');
      expect(response.body).toHaveProperty('skillGaps');
    });
  });

  describe('GET /api/employees/:id/skills/training-recommendations', () => {
    it('should return personalized training recommendations', async () => {
      const response = await request(app)
        .get('/api/employees/9003/skills/training-recommendations')
        .expect(200);

      expect(response.body).toHaveProperty('recommendations');
      expect(Array.isArray(response.body.recommendations)).toBe(true);
      
      if (response.body.recommendations.length > 0) {
        const recommendation = response.body.recommendations[0];
        expect(recommendation).toHaveProperty('skillName');
        expect(recommendation).toHaveProperty('priority');
        expect(recommendation).toHaveProperty('reason');
        expect(recommendation).toHaveProperty('suggestedResources');
      }
    });
  });
});

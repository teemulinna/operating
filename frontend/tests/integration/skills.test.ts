import request from 'supertest';
import app from '../../src/app';

describe('Skill Endpoints', () => {
  let authToken: string;

  beforeAll(async () => {
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@company.com',
        password: 'password123'
      });
    
    authToken = loginResponse.body.data.token;
  });

  describe('GET /api/skills', () => {
    it('should get all skills with authentication', async () => {
      const response = await request(app)
        .get('/api/skills')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        pagination: expect.any(Object)
      });
    });

    it('should support category filtering', async () => {
      const response = await request(app)
        .get('/api/skills?category=Programming')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty('category', 'Programming');
      }
    });

    it('should support level filtering', async () => {
      const response = await request(app)
        .get('/api/skills?level=advanced')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty('level', 'advanced');
      }
    });

    it('should support search filtering', async () => {
      const response = await request(app)
        .get('/api/skills?search=javascript')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/skills/:id', () => {
    it('should get skill by valid ID', async () => {
      const response = await request(app)
        .get('/api/skills/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: '1',
          name: expect.any(String),
          category: expect.any(String),
          level: expect.any(String)
        }
      });
    });

    it('should return 404 for non-existent skill', async () => {
      const response = await request(app)
        .get('/api/skills/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('not found')
      });
    });
  });

  describe('POST /api/skills', () => {
    const validSkill = {
      name: 'TypeScript',
      category: 'Programming',
      description: 'Typed superset of JavaScript',
      level: 'intermediate'
    };

    it('should create skill with valid data', async () => {
      const response = await request(app)
        .post('/api/skills')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validSkill)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          name: validSkill.name,
          category: validSkill.category,
          description: validSkill.description,
          level: validSkill.level
        },
        message: expect.stringContaining('created successfully')
      });
    });

    it('should reject skill creation with missing required fields', async () => {
      const incompleteSkill = {
        name: 'Incomplete Skill'
        // Missing category and level
      };

      const response = await request(app)
        .post('/api/skills')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteSkill)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.any(String)
      });
    });

    it('should reject skill creation with invalid level', async () => {
      const invalidSkill = {
        name: 'Invalid Skill',
        category: 'Programming',
        level: 'invalid-level'
      };

      const response = await request(app)
        .post('/api/skills')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidSkill)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Level must be')
      });
    });

    it('should reject duplicate skill names', async () => {
      const duplicateSkill = {
        name: 'JavaScript', // Existing skill
        category: 'Programming',
        level: 'intermediate'
      };

      const response = await request(app)
        .post('/api/skills')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateSkill)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('already exists')
      });
    });
  });

  describe('PUT /api/skills/:id', () => {
    it('should update skill with valid data', async () => {
      const updates = {
        name: 'JavaScript Updated',
        level: 'expert'
      };

      const response = await request(app)
        .put('/api/skills/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: '1',
          name: updates.name,
          level: updates.level
        },
        message: expect.stringContaining('updated successfully')
      });
    });

    it('should return 404 for non-existent skill', async () => {
      const updates = { name: 'Test Skill' };

      const response = await request(app)
        .put('/api/skills/999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('not found')
      });
    });
  });

  describe('DELETE /api/skills/:id', () => {
    it('should delete existing skill', async () => {
      const response = await request(app)
        .delete('/api/skills/5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('deleted successfully')
      });
    });

    it('should return 404 for non-existent skill', async () => {
      const response = await request(app)
        .delete('/api/skills/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('not found')
      });
    });
  });

  describe('GET /api/skills/stats', () => {
    it('should return skill statistics', async () => {
      const response = await request(app)
        .get('/api/skills/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          total: expect.any(Number),
          byCategory: expect.any(Object),
          byLevel: expect.any(Object),
          categories: expect.any(Array)
        }
      });
    });
  });

  describe('GET /api/skills/category/:category', () => {
    it('should get skills by category', async () => {
      const response = await request(app)
        .get('/api/skills/category/Programming')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array)
      });

      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty('category', 'Programming');
      }
    });
  });
});
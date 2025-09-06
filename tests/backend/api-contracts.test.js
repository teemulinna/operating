/**
 * Backend API Contracts Tests
 * Validates API endpoints meet TDD requirements and integration contracts
 * MUST BE WRITTEN BEFORE IMPLEMENTATION (TDD)
 */

const testData = require('../fixtures/shared-test-data.json');
const testContracts = require('../shared/test-contracts');

describe('Backend API Contracts (TDD)', () => {
  let apiClient, mockDb;

  beforeAll(async () => {
    apiClient = setupApiClient();
    mockDb = setupMockDatabase();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Endpoints (WRITE FIRST)', () => {
    const authContracts = testContracts.backend.endpoints.auth;

    describe('POST /api/auth/login', () => {
      const loginContract = authContracts['POST /api/auth/login'];

      it('should accept valid login credentials and return token', async () => {
        const loginData = {
          email: testData.users[0].email,
          password: 'test123456'
        };

        mockDb.findUserByEmail.mockResolvedValue(testData.users[0]);
        mockDb.validatePassword.mockResolvedValue(true);

        const response = await apiClient.post('/api/auth/login', loginData);

        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
          token: expect.any(String),
          user: expect.objectContaining({
            id: expect.any(Number),
            name: expect.any(String),
            email: expect.any(String),
            role: expect.any(String)
          })
        });

        // Validate contract compliance
        expect(typeof response.data.token).toBe(loginContract.output.token);
        expect(typeof response.data.user).toBe(loginContract.output.user);
      });

      it('should reject invalid credentials with 401', async () => {
        const invalidLogin = {
          email: 'invalid@example.com',
          password: 'wrongpassword'
        };

        mockDb.findUserByEmail.mockResolvedValue(null);

        const response = await apiClient.post('/api/auth/login', invalidLogin);

        expect(response.status).toBe(401);
        expect(loginContract.errors).toContain(401);
      });

      it('should validate required fields with 400', async () => {
        const incompleteLogin = {
          email: 'test@example.com'
          // missing password
        };

        const response = await apiClient.post('/api/auth/login', incompleteLogin);

        expect(response.status).toBe(400);
        expect(response.data.errors).toBeDefined();
        expect(loginContract.errors).toContain(400);
      });

      it('should enforce rate limiting with 429', async () => {
        const loginData = {
          email: testData.users[0].email,
          password: 'test123456'
        };

        // Simulate multiple rapid requests
        const promises = Array(10).fill().map(() => 
          apiClient.post('/api/auth/login', loginData)
        );

        const responses = await Promise.allSettled(promises);
        const rateLimitedResponse = responses.find(r => 
          r.status === 'fulfilled' && r.value.status === 429
        );

        expect(rateLimitedResponse).toBeDefined();
        expect(loginContract.errors).toContain(429);
      });

      it('should validate input format according to contract', async () => {
        const loginInput = {
          email: testData.users[0].email,
          password: 'test123456'
        };

        // Validate input contract
        expect(typeof loginInput.email).toBe(loginContract.input.email);
        expect(typeof loginInput.password).toBe(loginContract.input.password);
      });
    });

    describe('POST /api/auth/logout', () => {
      const logoutContract = authContracts['POST /api/auth/logout'];

      it('should accept valid token and return success', async () => {
        const logoutData = {
          token: testData.authTokens.admin
        };

        mockDb.invalidateToken.mockResolvedValue(true);

        const response = await apiClient.post('/api/auth/logout', logoutData);

        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
          success: expect.any(Boolean)
        });

        // Validate contract compliance
        expect(typeof response.data.success).toBe(logoutContract.output.success);
      });

      it('should reject invalid token with 401', async () => {
        const invalidLogout = {
          token: testData.authTokens.invalid
        };

        mockDb.findTokenByValue.mockResolvedValue(null);

        const response = await apiClient.post('/api/auth/logout', invalidLogout);

        expect(response.status).toBe(401);
        expect(logoutContract.errors).toContain(401);
      });
    });
  });

  describe('Users Endpoints (WRITE FIRST)', () => {
    const usersContracts = testContracts.backend.endpoints.users;

    describe('GET /api/users', () => {
      const getUsersContract = usersContracts['GET /api/users'];

      beforeEach(() => {
        apiClient.setAuthToken(testData.authTokens.admin);
      });

      it('should return paginated users list', async () => {
        const queryParams = { page: 1, limit: 10 };
        
        mockDb.getUsersPaginated.mockResolvedValue({
          users: testData.users,
          total: testData.users.length,
          page: 1
        });

        const response = await apiClient.get('/api/users', { params: queryParams });

        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
          users: expect.any(Array),
          total: expect.any(Number),
          page: expect.any(Number)
        });

        // Validate contract compliance
        expect(typeof queryParams.page).toBe(getUsersContract.input.page);
        expect(typeof queryParams.limit).toBe(getUsersContract.input.limit);
        expect(Array.isArray(response.data.users)).toBe(true);
        expect(typeof response.data.total).toBe(getUsersContract.output.total);
        expect(typeof response.data.page).toBe(getUsersContract.output.page);
      });

      it('should require authentication with 401', async () => {
        apiClient.setAuthToken(null);

        const response = await apiClient.get('/api/users');

        expect(response.status).toBe(401);
        expect(getUsersContract.errors).toContain(401);
      });

      it('should enforce authorization with 403', async () => {
        apiClient.setAuthToken(testData.authTokens.user); // Regular user token

        const response = await apiClient.get('/api/users');

        expect(response.status).toBe(403);
        expect(getUsersContract.errors).toContain(403);
      });
    });

    describe('POST /api/users', () => {
      const createUserContract = usersContracts['POST /api/users'];

      beforeEach(() => {
        apiClient.setAuthToken(testData.authTokens.admin);
      });

      it('should create new user with valid data', async () => {
        const newUser = {
          name: 'New Test User',
          email: 'newuser@example.com',
          role: 'user'
        };

        const createdUser = { ...newUser, id: 99 };
        mockDb.createUser.mockResolvedValue(createdUser);
        mockDb.findUserByEmail.mockResolvedValue(null); // Email not taken

        const response = await apiClient.post('/api/users', newUser);

        expect(response.status).toBe(201);
        expect(response.data).toMatchObject({
          user: expect.objectContaining({
            id: expect.any(Number),
            name: newUser.name,
            email: newUser.email,
            role: newUser.role
          })
        });

        // Validate contract compliance
        expect(typeof newUser.name).toBe(createUserContract.input.name);
        expect(typeof newUser.email).toBe(createUserContract.input.email);
        expect(typeof newUser.role).toBe(createUserContract.input.role);
        expect(typeof response.data.user).toBe(createUserContract.output.user);
      });

      it('should validate required fields with 400', async () => {
        const incompleteUser = {
          name: 'Test User'
          // missing email and role
        };

        const response = await apiClient.post('/api/users', incompleteUser);

        expect(response.status).toBe(400);
        expect(response.data.errors).toBeDefined();
        expect(createUserContract.errors).toContain(400);
      });

      it('should prevent duplicate email with 409', async () => {
        const duplicateUser = {
          name: 'Duplicate User',
          email: testData.users[0].email, // Existing email
          role: 'user'
        };

        mockDb.findUserByEmail.mockResolvedValue(testData.users[0]);

        const response = await apiClient.post('/api/users', duplicateUser);

        expect(response.status).toBe(409);
        expect(createUserContract.errors).toContain(409);
      });

      it('should require admin authentication with 403', async () => {
        apiClient.setAuthToken(testData.authTokens.user);

        const newUser = {
          name: 'Unauthorized User',
          email: 'unauthorized@example.com',
          role: 'user'
        };

        const response = await apiClient.post('/api/users', newUser);

        expect(response.status).toBe(403);
        expect(createUserContract.errors).toContain(403);
      });
    });
  });

  describe('Projects Endpoints (WRITE FIRST)', () => {
    const projectsContracts = testContracts.backend.endpoints.projects;

    describe('GET /api/projects', () => {
      const getProjectsContract = projectsContracts['GET /api/projects'];

      beforeEach(() => {
        apiClient.setAuthToken(testData.authTokens.manager);
      });

      it('should return projects for authenticated user', async () => {
        const queryParams = { userId: testData.users[1].id };

        mockDb.getProjectsByUser.mockResolvedValue(
          testData.projects.filter(p => p.ownerId === queryParams.userId)
        );

        const response = await apiClient.get('/api/projects', { params: queryParams });

        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
          projects: expect.any(Array)
        });

        // Validate contract compliance
        expect(typeof queryParams.userId).toBe(getProjectsContract.input.userId);
        expect(Array.isArray(response.data.projects)).toBe(true);
      });

      it('should require authentication with 401', async () => {
        apiClient.setAuthToken(null);

        const response = await apiClient.get('/api/projects');

        expect(response.status).toBe(401);
        expect(getProjectsContract.errors).toContain(401);
      });

      it('should enforce user access control with 403', async () => {
        apiClient.setAuthToken(testData.authTokens.user);
        const queryParams = { userId: testData.users[0].id }; // Different user

        const response = await apiClient.get('/api/projects', { params: queryParams });

        expect(response.status).toBe(403);
        expect(getProjectsContract.errors).toContain(403);
      });
    });

    describe('POST /api/projects', () => {
      const createProjectContract = projectsContracts['POST /api/projects'];

      beforeEach(() => {
        apiClient.setAuthToken(testData.authTokens.manager);
      });

      it('should create new project with valid data', async () => {
        const newProject = {
          name: 'API Test Project',
          description: 'Project created via API test'
        };

        const createdProject = { 
          ...newProject, 
          id: 99, 
          status: 'planning', 
          ownerId: testData.users[1].id 
        };
        mockDb.createProject.mockResolvedValue(createdProject);

        const response = await apiClient.post('/api/projects', newProject);

        expect(response.status).toBe(201);
        expect(response.data).toMatchObject({
          project: expect.objectContaining({
            id: expect.any(Number),
            name: newProject.name,
            description: newProject.description,
            status: expect.any(String),
            ownerId: expect.any(Number)
          })
        });

        // Validate contract compliance
        expect(typeof newProject.name).toBe(createProjectContract.input.name);
        expect(typeof newProject.description).toBe(createProjectContract.input.description);
        expect(typeof response.data.project).toBe(createProjectContract.output.project);
      });

      it('should validate required fields with 400', async () => {
        const incompleteProject = {
          description: 'Missing name'
          // missing name
        };

        const response = await apiClient.post('/api/projects', incompleteProject);

        expect(response.status).toBe(400);
        expect(response.data.errors).toBeDefined();
        expect(createProjectContract.errors).toContain(400);
      });

      it('should require authentication with 401', async () => {
        apiClient.setAuthToken(null);

        const newProject = {
          name: 'Unauthorized Project',
          description: 'Should not be created'
        };

        const response = await apiClient.post('/api/projects', newProject);

        expect(response.status).toBe(401);
        expect(createProjectContract.errors).toContain(401);
      });

      it('should enforce project creation permissions with 403', async () => {
        apiClient.setAuthToken(testData.authTokens.user); // Regular user

        const newProject = {
          name: 'Forbidden Project',
          description: 'User should not create projects'
        };

        const response = await apiClient.post('/api/projects', newProject);

        expect(response.status).toBe(403);
        expect(createProjectContract.errors).toContain(403);
      });
    });
  });

  describe('Resources Endpoints (WRITE FIRST)', () => {
    const resourcesContracts = testContracts.backend.endpoints.resources;

    describe('GET /api/resources', () => {
      const getResourcesContract = resourcesContracts['GET /api/resources'];

      beforeEach(() => {
        apiClient.setAuthToken(testData.authTokens.manager);
      });

      it('should return resources for valid project', async () => {
        const queryParams = { projectId: testData.projects[0].id };

        mockDb.getResourcesByProject.mockResolvedValue(
          testData.resources.filter(r => r.projectId === queryParams.projectId)
        );

        const response = await apiClient.get('/api/resources', { params: queryParams });

        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
          resources: expect.any(Array)
        });

        // Validate contract compliance
        expect(typeof queryParams.projectId).toBe(getResourcesContract.input.projectId);
        expect(Array.isArray(response.data.resources)).toBe(true);
      });

      it('should require authentication with 401', async () => {
        apiClient.setAuthToken(null);

        const response = await apiClient.get('/api/resources');

        expect(response.status).toBe(401);
        expect(getResourcesContract.errors).toContain(401);
      });

      it('should enforce project access with 403', async () => {
        apiClient.setAuthToken(testData.authTokens.user);
        const queryParams = { projectId: testData.projects[0].id };

        mockDb.getUserProjectAccess.mockResolvedValue(false);

        const response = await apiClient.get('/api/resources', { params: queryParams });

        expect(response.status).toBe(403);
        expect(getResourcesContract.errors).toContain(403);
      });

      it('should handle non-existent project with 404', async () => {
        const queryParams = { projectId: 9999 };

        mockDb.getResourcesByProject.mockResolvedValue(null);

        const response = await apiClient.get('/api/resources', { params: queryParams });

        expect(response.status).toBe(404);
        expect(getResourcesContract.errors).toContain(404);
      });
    });

    describe('POST /api/resources', () => {
      const createResourceContract = resourcesContracts['POST /api/resources'];

      beforeEach(() => {
        apiClient.setAuthToken(testData.authTokens.manager);
      });

      it('should create new resource with valid data', async () => {
        const newResource = {
          name: 'API Test Resource',
          type: 'equipment',
          projectId: testData.projects[0].id
        };

        const createdResource = { 
          ...newResource, 
          id: 99, 
          availability: 'available' 
        };
        mockDb.createResource.mockResolvedValue(createdResource);
        mockDb.getProjectById.mockResolvedValue(testData.projects[0]);

        const response = await apiClient.post('/api/resources', newResource);

        expect(response.status).toBe(201);
        expect(response.data).toMatchObject({
          resource: expect.objectContaining({
            id: expect.any(Number),
            name: newResource.name,
            type: newResource.type,
            projectId: newResource.projectId,
            availability: expect.any(String)
          })
        });

        // Validate contract compliance
        expect(typeof newResource.name).toBe(createResourceContract.input.name);
        expect(typeof newResource.type).toBe(createResourceContract.input.type);
        expect(typeof newResource.projectId).toBe(createResourceContract.input.projectId);
        expect(typeof response.data.resource).toBe(createResourceContract.output.resource);
      });

      it('should validate required fields with 400', async () => {
        const incompleteResource = {
          type: 'equipment'
          // missing name and projectId
        };

        const response = await apiClient.post('/api/resources', incompleteResource);

        expect(response.status).toBe(400);
        expect(response.data.errors).toBeDefined();
        expect(createResourceContract.errors).toContain(400);
      });

      it('should require authentication with 401', async () => {
        apiClient.setAuthToken(null);

        const newResource = {
          name: 'Unauthorized Resource',
          type: 'equipment',
          projectId: testData.projects[0].id
        };

        const response = await apiClient.post('/api/resources', newResource);

        expect(response.status).toBe(401);
        expect(createResourceContract.errors).toContain(401);
      });

      it('should enforce project access permissions with 403', async () => {
        apiClient.setAuthToken(testData.authTokens.user);

        const newResource = {
          name: 'Forbidden Resource',
          type: 'equipment',
          projectId: testData.projects[0].id
        };

        mockDb.getUserProjectAccess.mockResolvedValue(false);

        const response = await apiClient.post('/api/resources', newResource);

        expect(response.status).toBe(403);
        expect(createResourceContract.errors).toContain(403);
      });

      it('should handle non-existent project with 404', async () => {
        const newResource = {
          name: 'Orphaned Resource',
          type: 'equipment',
          projectId: 9999
        };

        mockDb.getProjectById.mockResolvedValue(null);

        const response = await apiClient.post('/api/resources', newResource);

        expect(response.status).toBe(404);
        expect(createResourceContract.errors).toContain(404);
      });
    });
  });

  describe('Performance Tests (WRITE FIRST)', () => {
    it('should meet response time requirements', async () => {
      const performanceRequirements = testContracts.backend.performanceRequirements;
      
      apiClient.setAuthToken(testData.authTokens.admin);
      mockDb.getUsersPaginated.mockResolvedValue({
        users: testData.users,
        total: testData.users.length,
        page: 1
      });

      const start = Date.now();
      const response = await apiClient.get('/api/users');
      const responseTime = Date.now() - start;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(parseInt(performanceRequirements.responseTime));
    });

    it('should handle concurrent requests', async () => {
      const performanceRequirements = testContracts.backend.performanceRequirements;
      
      apiClient.setAuthToken(testData.authTokens.admin);
      mockDb.getUsersPaginated.mockResolvedValue({
        users: testData.users,
        total: testData.users.length,
        page: 1
      });

      // Send 50 concurrent requests
      const requests = Array(50).fill().map(() => apiClient.get('/api/users'));
      
      const start = Date.now();
      const responses = await Promise.allSettled(requests);
      const totalTime = Date.now() - start;

      const successfulResponses = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );

      // Should handle concurrent load
      expect(successfulResponses.length).toBeGreaterThan(45); // 90% success rate
      expect(totalTime).toBeLessThan(5000); // Complete within 5 seconds
    });
  });
});

// Test Helper Functions
function setupApiClient() {
  return {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    setAuthToken: jest.fn()
  };
}

function setupMockDatabase() {
  return {
    findUserByEmail: jest.fn(),
    validatePassword: jest.fn(),
    invalidateToken: jest.fn(),
    findTokenByValue: jest.fn(),
    getUsersPaginated: jest.fn(),
    createUser: jest.fn(),
    createProject: jest.fn(),
    getProjectsByUser: jest.fn(),
    createResource: jest.fn(),
    getResourcesByProject: jest.fn(),
    getProjectById: jest.fn(),
    getUserProjectAccess: jest.fn()
  };
}
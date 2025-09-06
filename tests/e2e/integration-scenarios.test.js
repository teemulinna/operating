/**
 * End-to-End Integration Test Scenarios
 * Validates complete workflows across Database, Backend, and Frontend teams
 */

const testData = require('../fixtures/shared-test-data.json');
const testContracts = require('../shared/test-contracts');

describe('E2E Integration Scenarios', () => {
  let dbConnection, apiClient, webDriver;

  beforeAll(async () => {
    // Setup database connection for testing
    dbConnection = await setupTestDatabase();
    
    // Setup API client for backend testing
    apiClient = setupApiClient();
    
    // Setup web driver for frontend testing
    webDriver = await setupWebDriver();
    
    // Seed test data
    await seedTestData();
  });

  afterAll(async () => {
    await dbConnection.close();
    await webDriver.quit();
  });

  describe('User Registration and Authentication Flow', () => {
    it('should complete full user registration workflow', async () => {
      const newUser = {
        name: 'Integration Test User',
        email: 'integration@test.com',
        role: 'user',
        password: 'test123456'
      };

      // Step 1: Frontend form validation
      await webDriver.get('/register');
      await webDriver.findElement({ id: 'name' }).sendKeys(newUser.name);
      await webDriver.findElement({ id: 'email' }).sendKeys(newUser.email);
      await webDriver.findElement({ id: 'password' }).sendKeys(newUser.password);
      
      const submitButton = await webDriver.findElement({ id: 'register-submit' });
      expect(await submitButton.isEnabled()).toBe(true);

      // Step 2: API endpoint validation
      const response = await apiClient.post('/api/auth/register', newUser);
      expect(response.status).toBe(201);
      expect(response.data.user).toHaveProperty('id');
      expect(response.data.user.email).toBe(newUser.email);

      // Step 3: Database user creation verification
      const dbUser = await dbConnection.query(
        'SELECT * FROM users WHERE email = ?', 
        [newUser.email]
      );
      expect(dbUser.length).toBe(1);
      expect(dbUser[0].name).toBe(newUser.name);
      expect(dbUser[0].role).toBe(newUser.role);

      // Step 4: Login verification
      const loginResponse = await apiClient.post('/api/auth/login', {
        email: newUser.email,
        password: newUser.password
      });
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.data).toHaveProperty('token');

      // Step 5: Frontend authentication state update
      await webDriver.get('/login');
      await webDriver.findElement({ id: 'email' }).sendKeys(newUser.email);
      await webDriver.findElement({ id: 'password' }).sendKeys(newUser.password);
      await webDriver.findElement({ id: 'login-submit' }).click();
      
      await webDriver.wait(
        async () => {
          const currentUrl = await webDriver.getCurrentUrl();
          return currentUrl.includes('/dashboard');
        }, 
        5000
      );
    });

    it('should handle invalid registration data gracefully', async () => {
      const invalidUser = {
        name: '', // Invalid: empty name
        email: 'invalid-email', // Invalid: bad format
        role: 'unknown', // Invalid: non-existent role
        password: '123' // Invalid: too short
      };

      // Frontend validation should catch errors
      await webDriver.get('/register');
      await webDriver.findElement({ id: 'name' }).sendKeys(invalidUser.name);
      await webDriver.findElement({ id: 'email' }).sendKeys(invalidUser.email);
      await webDriver.findElement({ id: 'password' }).sendKeys(invalidUser.password);

      const submitButton = await webDriver.findElement({ id: 'register-submit' });
      expect(await submitButton.isEnabled()).toBe(false);

      // API should reject invalid data
      const response = await apiClient.post('/api/auth/register', invalidUser);
      expect(response.status).toBe(400);
      expect(response.data.errors).toBeDefined();

      // Database should remain unchanged
      const dbUsers = await dbConnection.query(
        'SELECT COUNT(*) as count FROM users WHERE email = ?', 
        [invalidUser.email]
      );
      expect(dbUsers[0].count).toBe(0);
    });
  });

  describe('Project Creation with Resource Assignment', () => {
    beforeEach(async () => {
      // Ensure authenticated user
      const authToken = await authenticateTestUser('admin@test.com');
      apiClient.setAuthToken(authToken);
    });

    it('should complete project creation and resource assignment workflow', async () => {
      const newProject = {
        name: 'Integration Test Project',
        description: 'Project created during integration testing',
        budget: 75000,
        startDate: '2024-06-01',
        endDate: '2024-12-31'
      };

      const resourceToAssign = testData.resources.find(r => r.availability === 'available');

      // Step 1: Frontend project form submission
      await webDriver.get('/projects/new');
      await webDriver.findElement({ id: 'project-name' }).sendKeys(newProject.name);
      await webDriver.findElement({ id: 'project-description' }).sendKeys(newProject.description);
      await webDriver.findElement({ id: 'project-budget' }).sendKeys(newProject.budget.toString());
      await webDriver.findElement({ id: 'project-submit' }).click();

      // Step 2: API project creation
      const createResponse = await apiClient.post('/api/projects', newProject);
      expect(createResponse.status).toBe(201);
      expect(createResponse.data.project).toHaveProperty('id');
      expect(createResponse.data.project.name).toBe(newProject.name);

      const projectId = createResponse.data.project.id;

      // Step 3: Database project verification
      const dbProject = await dbConnection.query(
        'SELECT * FROM projects WHERE id = ?', 
        [projectId]
      );
      expect(dbProject.length).toBe(1);
      expect(dbProject[0].name).toBe(newProject.name);
      expect(dbProject[0].budget).toBe(newProject.budget);

      // Step 4: Resource assignment
      const assignResponse = await apiClient.post('/api/resources/assign', {
        resourceId: resourceToAssign.id,
        projectId: projectId
      });
      expect(assignResponse.status).toBe(200);

      // Step 5: Database resource assignment verification
      const assignment = await dbConnection.query(
        'SELECT * FROM project_resources WHERE project_id = ? AND resource_id = ?',
        [projectId, resourceToAssign.id]
      );
      expect(assignment.length).toBe(1);

      // Step 6: Resource status update verification
      const updatedResource = await dbConnection.query(
        'SELECT * FROM resources WHERE id = ?',
        [resourceToAssign.id]
      );
      expect(updatedResource[0].availability).toBe('in-use');
      expect(updatedResource[0].project_id).toBe(projectId);

      // Step 7: Frontend UI verification
      await webDriver.get(`/projects/${projectId}`);
      const projectTitle = await webDriver.findElement({ className: 'project-title' }).getText();
      expect(projectTitle).toBe(newProject.name);

      const resourcesList = await webDriver.findElements({ className: 'assigned-resource' });
      expect(resourcesList.length).toBeGreaterThan(0);
    });

    it('should handle resource conflicts and availability', async () => {
      const unavailableResource = testData.resources.find(r => r.availability === 'in-use');
      const newProject = {
        name: 'Resource Conflict Test',
        description: 'Testing resource availability conflicts'
      };

      // Create project
      const createResponse = await apiClient.post('/api/projects', newProject);
      const projectId = createResponse.data.project.id;

      // Attempt to assign unavailable resource
      const assignResponse = await apiClient.post('/api/resources/assign', {
        resourceId: unavailableResource.id,
        projectId: projectId
      });
      
      expect(assignResponse.status).toBe(409); // Conflict
      expect(assignResponse.data.error).toContain('Resource not available');

      // Verify no assignment was created
      const assignment = await dbConnection.query(
        'SELECT * FROM project_resources WHERE project_id = ? AND resource_id = ?',
        [projectId, unavailableResource.id]
      );
      expect(assignment.length).toBe(0);
    });
  });

  describe('Real-time Resource Status Updates', () => {
    let webSocket;

    beforeEach(async () => {
      webSocket = await setupWebSocketConnection();
    });

    afterEach(async () => {
      if (webSocket) {
        await webSocket.close();
      }
    });

    it('should handle real-time resource availability updates', async () => {
      const resource = testData.resources.find(r => r.availability === 'available');
      
      // Step 1: Subscribe to resource updates via WebSocket
      const updates = [];
      webSocket.on('resource-update', (data) => {
        updates.push(data);
      });

      // Step 2: Update resource status via API
      const updateResponse = await apiClient.put(`/api/resources/${resource.id}`, {
        availability: 'maintenance'
      });
      expect(updateResponse.status).toBe(200);

      // Step 3: Verify database update
      const dbResource = await dbConnection.query(
        'SELECT * FROM resources WHERE id = ?',
        [resource.id]
      );
      expect(dbResource[0].availability).toBe('maintenance');

      // Step 4: Verify WebSocket notification
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for WebSocket
      expect(updates.length).toBe(1);
      expect(updates[0].resourceId).toBe(resource.id);
      expect(updates[0].availability).toBe('maintenance');

      // Step 5: Verify frontend UI update
      await webDriver.get('/resources');
      const resourceElement = await webDriver.findElement({ 
        css: `[data-resource-id="${resource.id}"] .availability-status` 
      });
      const status = await resourceElement.getText();
      expect(status).toBe('maintenance');
    });

    it('should handle concurrent resource updates', async () => {
      const resource = testData.resources.find(r => r.availability === 'available');
      
      // Simulate concurrent updates from different clients
      const update1Promise = apiClient.put(`/api/resources/${resource.id}`, {
        availability: 'in-use'
      });
      
      const update2Promise = apiClient.put(`/api/resources/${resource.id}`, {
        availability: 'maintenance'
      });

      const [response1, response2] = await Promise.all([update1Promise, update2Promise]);

      // One should succeed, one should fail or be resolved via conflict resolution
      expect([response1.status, response2.status]).toContain(200);
      
      // Final state should be consistent
      const finalState = await dbConnection.query(
        'SELECT * FROM resources WHERE id = ?',
        [resource.id]
      );
      expect(['in-use', 'maintenance']).toContain(finalState[0].availability);
    });
  });

  describe('Performance Integration Tests', () => {
    it('should meet performance requirements across all layers', async () => {
      const startTime = Date.now();

      // Database performance test
      const dbStart = Date.now();
      const users = await dbConnection.query('SELECT * FROM users LIMIT 100');
      const dbTime = Date.now() - dbStart;
      expect(dbTime).toBeLessThan(testContracts.qualityGates.performance.database.queryTime);

      // API performance test
      const apiStart = Date.now();
      const apiResponse = await apiClient.get('/api/users?limit=100');
      const apiTime = Date.now() - apiStart;
      expect(apiTime).toBeLessThan(testContracts.qualityGates.performance.backend.responseTime);
      expect(apiResponse.status).toBe(200);

      // Frontend performance test
      const renderStart = Date.now();
      await webDriver.get('/users');
      await webDriver.wait(
        async () => {
          const elements = await webDriver.findElements({ className: 'user-item' });
          return elements.length > 0;
        },
        5000
      );
      const renderTime = Date.now() - renderStart;
      expect(renderTime).toBeLessThan(1500); // 1.5s for page load

      const totalTime = Date.now() - startTime;
      console.log(`Total integration test time: ${totalTime}ms`);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database connection failures gracefully', async () => {
      // Simulate database failure
      await dbConnection.close();

      // API should handle database errors
      const response = await apiClient.get('/api/users');
      expect(response.status).toBe(503); // Service unavailable
      expect(response.data.error).toContain('Database unavailable');

      // Frontend should show error state
      await webDriver.get('/users');
      const errorMessage = await webDriver.findElement({ className: 'error-message' });
      expect(await errorMessage.isDisplayed()).toBe(true);

      // Restore connection for cleanup
      dbConnection = await setupTestDatabase();
    });

    it('should handle API service failures gracefully', async () => {
      // Frontend should handle API failures
      await webDriver.get('/users');
      
      // Simulate network failure by intercepting requests
      await webDriver.executeScript(`
        window.fetch = () => Promise.reject(new Error('Network error'));
      `);

      const refreshButton = await webDriver.findElement({ id: 'refresh-users' });
      await refreshButton.click();

      const errorMessage = await webDriver.findElement({ className: 'api-error' });
      expect(await errorMessage.isDisplayed()).toBe(true);
    });
  });
});

// Test Helpers
async function setupTestDatabase() {
  // Mock database connection setup
  return {
    query: jest.fn(),
    close: jest.fn()
  };
}

function setupApiClient() {
  // Mock API client setup
  return {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    setAuthToken: jest.fn()
  };
}

async function setupWebDriver() {
  // Mock WebDriver setup
  return {
    get: jest.fn(),
    findElement: jest.fn(),
    findElements: jest.fn(),
    wait: jest.fn(),
    getCurrentUrl: jest.fn(),
    executeScript: jest.fn(),
    quit: jest.fn()
  };
}

async function setupWebSocketConnection() {
  // Mock WebSocket setup
  return {
    on: jest.fn(),
    close: jest.fn()
  };
}

async function seedTestData() {
  // Seed database with test data
  // Implementation would depend on actual database setup
}

async function authenticateTestUser(email) {
  // Return mock auth token for testing
  return testData.authTokens[email.split('@')[0]];
}
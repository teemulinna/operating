/**
 * Shared Test Contracts for Cross-Team Integration
 * Defines the testing contracts that all teams must implement
 */

const testContracts = {
  /**
   * Database Team Contracts
   */
  database: {
    required: [
      'schema-validation.test.js',
      'migration.test.js', 
      'connection-pool.test.js',
      'data-integrity.test.js',
      'performance.test.js'
    ],
    schemas: {
      user: {
        testFields: ['id', 'name', 'email', 'role', 'createdAt', 'updatedAt'],
        constraints: ['email_unique', 'name_not_null', 'role_enum'],
        relationships: ['user_projects', 'user_resources']
      },
      project: {
        testFields: ['id', 'name', 'description', 'status', 'ownerId', 'createdAt'],
        constraints: ['name_not_null', 'owner_fk', 'status_enum'],
        relationships: ['project_resources', 'project_owner']
      },
      resource: {
        testFields: ['id', 'name', 'type', 'availability', 'projectId'],
        constraints: ['name_not_null', 'project_fk', 'availability_enum'],
        relationships: ['resource_project']
      }
    },
    performanceRequirements: {
      connectionTime: '< 100ms',
      queryTime: '< 50ms',
      bulkInsert: '< 1000ms for 1000 records'
    }
  },

  /**
   * Backend API Team Contracts
   */
  backend: {
    required: [
      'auth.test.js',
      'users.api.test.js',
      'projects.api.test.js', 
      'resources.api.test.js',
      'middleware.test.js',
      'validation.test.js',
      'error-handling.test.js'
    ],
    endpoints: {
      auth: {
        'POST /api/auth/login': {
          input: { email: 'string', password: 'string' },
          output: { token: 'string', user: 'object' },
          errors: [400, 401, 429]
        },
        'POST /api/auth/logout': {
          input: { token: 'string' },
          output: { success: 'boolean' },
          errors: [401]
        }
      },
      users: {
        'GET /api/users': {
          input: { page: 'number', limit: 'number' },
          output: { users: 'array', total: 'number', page: 'number' },
          errors: [401, 403]
        },
        'POST /api/users': {
          input: { name: 'string', email: 'string', role: 'string' },
          output: { user: 'object' },
          errors: [400, 401, 403, 409]
        }
      },
      projects: {
        'GET /api/projects': {
          input: { userId: 'number' },
          output: { projects: 'array' },
          errors: [401, 403]
        },
        'POST /api/projects': {
          input: { name: 'string', description: 'string' },
          output: { project: 'object' },
          errors: [400, 401, 403]
        }
      },
      resources: {
        'GET /api/resources': {
          input: { projectId: 'number' },
          output: { resources: 'array' },
          errors: [401, 403, 404]
        },
        'POST /api/resources': {
          input: { name: 'string', type: 'string', projectId: 'number' },
          output: { resource: 'object' },
          errors: [400, 401, 403, 404]
        }
      }
    },
    performanceRequirements: {
      responseTime: '< 200ms',
      concurrency: '100 concurrent requests',
      errorRate: '< 1%'
    }
  },

  /**
   * Frontend Team Contracts
   */
  frontend: {
    required: [
      'auth.component.test.js',
      'user-list.component.test.js',
      'project-form.component.test.js',
      'resource-grid.component.test.js',
      'navigation.component.test.js',
      'error-boundary.test.js',
      'hooks.test.js'
    ],
    components: {
      AuthComponent: {
        props: ['onLogin', 'onLogout', 'user'],
        states: ['loading', 'authenticated', 'error'],
        events: ['login', 'logout', 'error']
      },
      UserList: {
        props: ['users', 'onUserSelect', 'loading'],
        states: ['empty', 'loading', 'loaded', 'error'],
        events: ['userSelect', 'refresh']
      },
      ProjectForm: {
        props: ['project', 'onSubmit', 'onCancel'],
        states: ['clean', 'dirty', 'validating', 'submitting'],
        events: ['change', 'submit', 'cancel']
      },
      ResourceGrid: {
        props: ['resources', 'onResourceUpdate'],
        states: ['loading', 'loaded', 'updating', 'error'],
        events: ['resourceUpdate', 'statusChange']
      }
    },
    performanceRequirements: {
      renderTime: '< 16ms (60 FPS)',
      bundleSize: '< 500KB gzipped',
      firstContentfulPaint: '< 1.5s'
    }
  },

  /**
   * Integration Test Contracts
   */
  integration: {
    scenarios: [
      {
        name: 'User Registration Flow',
        teams: ['backend', 'frontend', 'database'],
        steps: [
          'Frontend form validation',
          'API endpoint validation',
          'Database user creation',
          'Email notification',
          'Login verification'
        ]
      },
      {
        name: 'Project Creation with Resources',
        teams: ['backend', 'frontend', 'database'],
        steps: [
          'User authentication',
          'Project form submission',
          'Database project creation',
          'Resource assignment',
          'UI update verification'
        ]
      },
      {
        name: 'Resource Availability Update',
        teams: ['backend', 'frontend', 'database'],
        steps: [
          'Real-time status change',
          'Database update',
          'WebSocket notification',
          'UI refresh',
          'Conflict resolution'
        ]
      }
    ],
    sharedTestData: {
      users: [
        { id: 1, name: 'Test Admin', email: 'admin@test.com', role: 'admin' },
        { id: 2, name: 'Test Manager', email: 'manager@test.com', role: 'manager' },
        { id: 3, name: 'Test User', email: 'user@test.com', role: 'user' }
      ],
      projects: [
        { id: 1, name: 'Integration Project', ownerId: 1, status: 'active' }
      ],
      resources: [
        { id: 1, name: 'Test Equipment', type: 'equipment', projectId: 1, availability: 'available' }
      ]
    }
  },

  /**
   * Quality Gates - Must pass before deployment
   */
  qualityGates: {
    coverage: {
      minimum: 90,
      branches: 85,
      functions: 90,
      lines: 90
    },
    performance: {
      database: { queryTime: 50, connectionTime: 100 },
      backend: { responseTime: 200, errorRate: 1 },
      frontend: { renderTime: 16, bundleSize: 512000 }
    },
    security: {
      authentication: 'required',
      authorization: 'role-based',
      inputValidation: 'sanitized',
      sqlInjection: 'prevented',
      xss: 'prevented'
    }
  }
};

module.exports = testContracts;
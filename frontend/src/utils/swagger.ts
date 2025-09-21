import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ResourceForge API',
      version: '1.0.0',
      description: 'ResourceForge - Intelligent Resource Planning & Capacity Management API',
      contact: {
        name: 'API Support',
        email: 'support@resourceforge.com'
      },
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Employee: {
          type: 'object',
          required: ['firstName', 'lastName', 'email', 'position', 'departmentId', 'salary', 'hireDate'],
          properties: {
            id: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phoneNumber: { type: 'string' },
            position: { type: 'string' },
            departmentId: { type: 'string' },
            salary: { type: 'number', minimum: 0 },
            hireDate: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['active', 'inactive', 'terminated'] },
            skills: { type: 'array', items: { type: 'string' } },
            managerId: { type: 'string' },
            profileImage: { type: 'string' },
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                zipCode: { type: 'string' },
                country: { type: 'string' }
              }
            }
          }
        },
        Department: {
          type: 'object',
          required: ['name'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            managerId: { type: 'string' },
            budget: { type: 'number', minimum: 0 },
            location: { type: 'string' }
          }
        },
        Skill: {
          type: 'object',
          required: ['name', 'category', 'level'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            category: { type: 'string' },
            description: { type: 'string' },
            level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced', 'expert'] }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'string' } },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                pages: { type: 'number' }
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const specs = swaggerJsdoc(options);
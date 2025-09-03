# Employee Management System - Developer Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Development Setup](#development-setup)
3. [API Documentation](#api-documentation)
4. [Database Schema](#database-schema)
5. [Authentication & Authorization](#authentication--authorization)
6. [Testing Strategy](#testing-strategy)
7. [Deployment](#deployment)
8. [Contributing](#contributing)

## Architecture Overview

The Employee Management System follows a modern REST API architecture with the following components:

### Technology Stack
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi validation library
- **Testing**: Jest with Supertest
- **Documentation**: OpenAPI/Swagger
- **Containerization**: Docker with Docker Compose
- **Reverse Proxy**: Nginx
- **Monitoring**: Prometheus & Grafana

### Project Structure
```
├── src/
│   ├── controllers/         # Request handlers
│   ├── middleware/          # Custom middleware
│   ├── models/             # Database models
│   ├── routes/             # API route definitions
│   ├── services/           # Business logic
│   ├── utils/              # Utility functions
│   ├── validators/         # Input validation schemas
│   └── app.js              # Application entry point
├── tests/
│   ├── integration/        # Integration tests
│   ├── unit/              # Unit tests
│   └── security/          # Security tests
├── deployment/
│   ├── docker/            # Docker configuration
│   └── scripts/           # Deployment scripts
├── docs/                  # Documentation
├── config/                # Configuration files
└── migrations/            # Database migrations
```

### Design Patterns
- **MVC Pattern**: Controllers handle requests, models define data structure, views are handled by frontend
- **Repository Pattern**: Data access abstraction through Sequelize ORM
- **Middleware Pattern**: Request/response processing pipeline
- **Factory Pattern**: Model and service instantiation

## Development Setup

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v13 or higher)
- Redis (optional, for caching)
- Docker & Docker Compose (for containerized development)

### Local Development Setup

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd employee-management-system
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   ./deployment/scripts/setup-env.sh development
   ```

4. **Database Setup**
   ```bash
   # Create database
   createdb employee_management_development
   
   # Run migrations
   npm run migrate
   
   # Seed data (optional)
   npm run seed
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

### Docker Development Setup

1. **Build and Start Services**
   ```bash
   docker-compose -f deployment/docker/docker-compose.yml up --build
   ```

2. **Run Migrations**
   ```bash
   docker-compose exec app npm run migrate
   ```

## API Documentation

### RESTful API Endpoints

#### Authentication Endpoints
```http
POST /api/auth/register    # Register new user
POST /api/auth/login       # User login
GET  /api/auth/me         # Get current user
POST /api/auth/logout     # User logout
POST /api/auth/refresh    # Refresh token
```

#### Employee Endpoints
```http
GET    /api/employees           # List employees (paginated)
POST   /api/employees           # Create employee
GET    /api/employees/:id       # Get employee by ID
PUT    /api/employees/:id       # Update employee
DELETE /api/employees/:id       # Delete employee
GET    /api/employees/search    # Advanced search
```

#### Health & Monitoring
```http
GET /api/health               # Health check
GET /api/metrics             # Prometheus metrics
```

### Request/Response Examples

#### Create Employee
```http
POST /api/employees
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@company.com",
  "position": "Software Developer",
  "department": "Engineering",
  "salary": 75000,
  "hireDate": "2024-01-15",
  "phone": "+1-555-123-4567",
  "address": "123 Main St, City, State 12345"
}
```

#### Response
```json
{
  "id": 1,
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@company.com",
  "position": "Software Developer",
  "department": "Engineering",
  "salary": 75000.00,
  "hireDate": "2024-01-15",
  "phone": "+1-555-123-4567",
  "address": "123 Main St, City, State 12345",
  "createdAt": "2024-01-10T10:00:00.000Z",
  "updatedAt": "2024-01-10T10:00:00.000Z"
}
```

### Error Handling
All API errors follow a consistent format:

```json
{
  "error": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ],
  "timestamp": "2024-01-10T10:00:00.000Z",
  "path": "/api/employees"
}
```

#### HTTP Status Codes
- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `429` - Too Many Requests
- `500` - Internal Server Error

## Database Schema

### User Model
```javascript
{
  id: INTEGER (Primary Key),
  email: STRING (Unique, Not Null),
  password: STRING (Not Null, Hashed),
  firstName: STRING (Not Null),
  lastName: STRING (Not Null),
  role: ENUM ('admin', 'manager', 'employee'),
  createdAt: DATE,
  updatedAt: DATE
}
```

### Employee Model
```javascript
{
  id: INTEGER (Primary Key),
  firstName: STRING (Not Null),
  lastName: STRING (Not Null),
  email: STRING (Unique, Not Null),
  position: STRING (Not Null),
  department: STRING (Not Null),
  salary: DECIMAL (Not Null),
  hireDate: DATE,
  phone: STRING,
  address: TEXT,
  createdAt: DATE,
  updatedAt: DATE
}
```

### Relationships
- Currently no direct relationships between User and Employee models
- Future enhancement could link users to employee records

### Migrations
Database migrations are located in the `migrations/` directory and follow Sequelize conventions:

```bash
# Create new migration
npx sequelize-cli migration:generate --name migration-name

# Run migrations
npm run migrate

# Rollback migration
npm run migrate:undo
```

## Authentication & Authorization

### JWT Implementation
The system uses JSON Web Tokens for stateless authentication:

```javascript
// Token payload structure
{
  userId: 1,
  email: "user@company.com",
  role: "admin",
  iat: 1640995200,  // Issued at
  exp: 1641081600   // Expires at
}
```

### Middleware Chain
```javascript
// Authentication flow
Request → Rate Limiting → CORS → Security Headers → 
JWT Verification → Role Authorization → Route Handler
```

### Role-Based Access Control (RBAC)

#### Permission Matrix
| Endpoint | Employee | Manager | Admin |
|----------|----------|---------|-------|
| GET /employees | ❌ | ✅ (dept) | ✅ (all) |
| POST /employees | ❌ | ✅ (dept) | ✅ |
| PUT /employees/:id | ❌ | ✅ (dept) | ✅ |
| DELETE /employees/:id | ❌ | ✅ (dept) | ✅ |

#### Authorization Middleware
```javascript
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.' 
      });
    }
    
    next();
  };
};
```

## Testing Strategy

### Testing Pyramid
1. **Unit Tests** (70%): Individual functions and methods
2. **Integration Tests** (20%): API endpoints and database interactions
3. **End-to-End Tests** (10%): Complete user workflows

### Test Structure
```javascript
describe('Employee Controller', () => {
  beforeAll(async () => {
    // Test database setup
  });
  
  afterAll(async () => {
    // Cleanup
  });
  
  beforeEach(async () => {
    // Reset test data
  });
  
  describe('POST /api/employees', () => {
    test('should create employee with valid data', async () => {
      // Test implementation
    });
    
    test('should reject invalid email format', async () => {
      // Test implementation
    });
  });
});
```

### Running Tests
```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Security tests
npm run test:security

# Test coverage
npm run test:coverage
```

### Test Data Management
```javascript
// Test factories for consistent test data
const createTestUser = async (overrides = {}) => {
  return await User.create({
    email: 'test@example.com',
    password: await bcrypt.hash('password123', 10),
    firstName: 'Test',
    lastName: 'User',
    role: 'employee',
    ...overrides
  });
};
```

## Security Implementation

### Input Validation
All inputs are validated using Joi schemas:

```javascript
const employeeSchema = Joi.object({
  firstName: Joi.string().required().max(50),
  lastName: Joi.string().required().max(50),
  email: Joi.string().email().required(),
  position: Joi.string().required().max(100),
  department: Joi.string().required().max(50),
  salary: Joi.number().positive().required(),
  hireDate: Joi.date().iso(),
  phone: Joi.string().pattern(/^[+]?[1-9][\d\s\-\(\)]{7,15}$/),
  address: Joi.string().max(255)
});
```

### Security Middleware Stack
1. **Helmet**: Security headers
2. **Rate Limiting**: Prevent brute force attacks
3. **CORS**: Cross-origin resource sharing
4. **Input Sanitization**: XSS protection
5. **SQL Injection Protection**: Parameterized queries

### Password Security
```javascript
// Password hashing
const hashPassword = async (password) => {
  const saltRounds = process.env.BCRYPT_ROUNDS || 12;
  return await bcrypt.hash(password, saltRounds);
};

// Password validation
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasNonalphas = /\W/.test(password);
  
  return {
    isValid: password.length >= minLength && hasUpperCase && 
             hasLowerCase && hasNumbers && hasNonalphas,
    errors: []
  };
};
```

## Performance Optimization

### Database Optimization
```javascript
// Efficient queries with proper indexing
const getEmployees = async (options = {}) => {
  const { page = 1, limit = 10, search, department } = options;
  
  const whereClause = {};
  
  if (search) {
    whereClause[Op.or] = [
      { firstName: { [Op.iLike]: `%${search}%` } },
      { lastName: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } }
    ];
  }
  
  if (department) {
    whereClause.department = department;
  }
  
  return await Employee.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['firstName', 'ASC']]
  });
};
```

### Caching Strategy
```javascript
// Redis caching for frequently accessed data
const getCachedEmployees = async (cacheKey) => {
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  const employees = await Employee.findAll();
  await redis.setex(cacheKey, 300, JSON.stringify(employees)); // 5 min cache
  
  return employees;
};
```

## Monitoring & Logging

### Structured Logging
```javascript
const logger = require('./utils/logger');

logger.info('Employee created', {
  userId: req.user.id,
  employeeId: newEmployee.id,
  action: 'CREATE_EMPLOYEE'
});
```

### Metrics Collection
```javascript
// Prometheus metrics
const promClient = require('prom-client');

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Middleware to collect metrics
app.use((req, res, next) => {
  res.on('finish', () => {
    httpRequestsTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    });
  });
  next();
});
```

### Health Checks
```javascript
// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Database health check
    await sequelize.authenticate();
    
    // Redis health check (if enabled)
    if (redis) {
      await redis.ping();
    }
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      message: error.message
    });
  }
});
```

## Deployment

### Environment Configuration
```javascript
// config/config.js
module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'postgres',
    logging: console.log
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
};
```

### Docker Deployment
```bash
# Build and deploy
./deployment/scripts/deploy.sh production

# Scale services
docker-compose up --scale app=3

# Rolling updates
docker-compose up --force-recreate --no-deps app
```

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test
      
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: ./deployment/scripts/deploy.sh production
```

## Best Practices

### Code Quality
- Use ESLint and Prettier for consistent code formatting
- Follow semantic versioning for releases
- Write comprehensive JSDoc comments
- Use TypeScript for better type safety (future enhancement)

### Error Handling
```javascript
// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(err.statusCode || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});
```

### Database Best Practices
- Always use transactions for multi-table operations
- Implement proper database indexing
- Use connection pooling
- Regular database backups

### Security Checklist
- ✅ Input validation and sanitization
- ✅ SQL injection protection
- ✅ XSS protection
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ Secure headers
- ✅ Password hashing
- ✅ JWT security
- ✅ Environment variable protection

## Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make changes and add tests
4. Run the test suite: `npm test`
5. Commit changes: `git commit -m "Add new feature"`
6. Push to branch: `git push origin feature/new-feature`
7. Create a Pull Request

### Code Review Process
- All changes require code review
- Tests must pass
- Code coverage must not decrease
- Security scan must pass
- Documentation must be updated

### Release Process
1. Update version in package.json
2. Update CHANGELOG.md
3. Create release tag
4. Deploy to staging
5. Run integration tests
6. Deploy to production
7. Monitor application metrics

---

For additional technical support or questions, please contact the development team or create an issue in the repository.
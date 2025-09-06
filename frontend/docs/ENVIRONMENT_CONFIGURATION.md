# Employee Management System - Environment Configuration Guide

## 🎯 Configuration Overview

This guide provides comprehensive environment configuration for consistent deployment across development, testing, and production environments.

## 📁 Configuration Files

### Core Configuration Files
```
/
├── .env                          # Local development (git-ignored)
├── .env.example                  # Template for environment variables
├── .env.test                     # Testing environment
├── .env.production               # Production environment (secure)
├── docker-compose.yml            # Development containers
├── docker-compose.test.yml       # Testing containers
├── docker-compose.prod.yml       # Production containers
├── config/
│   ├── development.js            # Development-specific config
│   ├── production.js             # Production-specific config
│   └── test.js                   # Test-specific config
└── deployment/
    ├── dev.env                   # Development deployment
    ├── staging.env               # Staging deployment
    └── prod.env                  # Production deployment
```

## 🔧 Environment Variables Reference

### Core Application Variables
```bash
# Application
NODE_ENV=development                    # development|test|production
APP_NAME="Employee Management System"
APP_VERSION=1.0.0
PORT=3001                              # Backend API port

# Frontend Configuration
VITE_APP_NAME="Employee Management"
VITE_API_URL=http://localhost:3001/api # Backend API URL
VITE_NODE_ENV=development              # Frontend environment
VITE_ENABLE_QUERY_DEVTOOLS=true       # React Query DevTools
```

### Database Configuration
```bash
# PostgreSQL Database
DB_HOST=localhost                      # Database host
DB_PORT=5432                          # Database port  
DB_NAME=employee_management           # Database name
DB_USER=app_user                      # Database username
DB_PASSWORD=app_password              # Database password
DATABASE_URL=postgresql://app_user:app_password@localhost:5432/employee_management

# Connection Pool Settings
DB_POOL_MIN=2                         # Minimum connections
DB_POOL_MAX=20                        # Maximum connections
DB_IDLE_TIMEOUT=30000                 # Idle timeout (ms)
DB_CONNECTION_TIMEOUT=2000            # Connection timeout (ms)
```

### Redis Configuration
```bash
# Redis Cache
REDIS_HOST=localhost                  # Redis host
REDIS_PORT=6379                       # Redis port
REDIS_PASSWORD=                       # Redis password (if required)
REDIS_URL=redis://localhost:6379     # Complete Redis URL

# Session Configuration
SESSION_SECRET=your-session-secret-key # Session encryption key
SESSION_TIMEOUT=86400000              # Session timeout (24 hours)
```

### Authentication & Security
```bash
# JWT Configuration
JWT_SECRET=your-jwt-secret-key        # JWT signing secret
JWT_EXPIRES_IN=1h                     # JWT token expiration
JWT_REFRESH_EXPIRES_IN=7d             # Refresh token expiration

# Security Settings
CORS_ORIGIN=http://localhost:3000     # Frontend URL for CORS
BCRYPT_SALT_ROUNDS=12                 # Password hashing rounds
RATE_LIMIT_WINDOW_MS=900000           # Rate limiting window (15 min)
RATE_LIMIT_MAX_REQUESTS=100           # Max requests per window
```

### External Services
```bash
# Email Service (Optional)
EMAIL_SERVICE=smtp                    # Email service type
EMAIL_HOST=smtp.gmail.com             # SMTP host
EMAIL_PORT=587                        # SMTP port
EMAIL_USER=your-email@domain.com      # Email username
EMAIL_PASS=your-email-password        # Email password
EMAIL_FROM="Employee Management <noreply@domain.com>"

# File Storage (Optional)
STORAGE_TYPE=local                    # local|s3|azure|gcp
AWS_ACCESS_KEY_ID=                    # AWS credentials
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=employee-management
```

### Logging & Monitoring
```bash
# Logging Configuration
LOG_LEVEL=info                        # debug|info|warn|error
LOG_FORMAT=json                       # json|simple
LOG_FILE_ENABLED=true                 # Enable file logging
LOG_FILE_PATH=./logs/app.log         # Log file path
LOG_MAX_SIZE=10m                     # Max log file size
LOG_MAX_FILES=5                      # Max log files to keep

# Monitoring
ENABLE_METRICS=true                   # Enable Prometheus metrics
METRICS_PORT=9090                     # Metrics endpoint port
HEALTH_CHECK_INTERVAL=30000           # Health check interval (ms)
```

## 🐳 Docker Environment Configuration

### Development Environment
```yaml
# docker-compose.yml
services:
  frontend:
    environment:
      - NODE_ENV=development
      - VITE_API_URL=http://localhost:3001/api
      - CHOKIDAR_USEPOLLING=true
    ports:
      - "3000:3000"

  backend:
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://app_user:app_password@database:5432/employee_management
      - REDIS_URL=redis://redis:6379
      - CORS_ORIGIN=http://localhost:3000
    ports:
      - "3001:3001"

  database:
    environment:
      - POSTGRES_DB=employee_management
      - POSTGRES_USER=app_user
      - POSTGRES_PASSWORD=app_password
    ports:
      - "5432:5432"
```

### Testing Environment
```yaml
# docker-compose.test.yml
services:
  backend-test:
    environment:
      - NODE_ENV=test
      - DATABASE_URL=postgresql://test_user:test_password@test-database:5432/employee_management_test
      - JWT_SECRET=test-jwt-secret
      - REDIS_URL=redis://test-redis:6379
    
  test-database:
    environment:
      - POSTGRES_DB=employee_management_test
      - POSTGRES_USER=test_user
      - POSTGRES_PASSWORD=test_password
```

### Production Environment
```yaml
# docker-compose.prod.yml
services:
  backend:
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - CORS_ORIGIN=${FRONTEND_URL}
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

## 🔐 Security Configuration

### Environment Variable Security
```bash
# Development - .env.example (tracked in git)
DATABASE_URL=postgresql://app_user:app_password@localhost:5432/employee_management
JWT_SECRET=development-jwt-secret

# Production - .env.production (NOT tracked in git)
DATABASE_URL=postgresql://prod_user:complex_password@prod-db:5432/employee_management
JWT_SECRET=super-secure-jwt-secret-key-256-characters-long
```

### Secrets Management Best Practices
1. **Never commit secrets to version control**
2. **Use environment-specific secret management**
3. **Rotate secrets regularly**
4. **Use strong, unique passwords**
5. **Enable audit logging for secret access**

## 🌍 Environment-Specific Configurations

### Development Environment
```javascript
// config/development.js
module.exports = {
  database: {
    logging: true,              // Enable SQL query logging
    pool: { min: 1, max: 5 },  // Smaller connection pool
  },
  cache: {
    ttl: 300,                  // 5 minute cache
  },
  logging: {
    level: 'debug',            // Verbose logging
  },
  features: {
    enableDevTools: true,      // Enable development tools
    enableMockData: true,      # Use mock data for testing
  }
}
```

### Production Environment
```javascript
// config/production.js
module.exports = {
  database: {
    logging: false,            // Disable query logging
    pool: { min: 5, max: 20 }, // Larger connection pool
  },
  cache: {
    ttl: 3600,                // 1 hour cache
  },
  logging: {
    level: 'error',           // Error-only logging
  },
  features: {
    enableDevTools: false,    // Disable development tools
    enableMockData: false,    // Use real data only
  }
}
```

### Testing Environment
```javascript
// config/test.js
module.exports = {
  database: {
    logging: false,           // Disable logging in tests
    pool: { min: 1, max: 3 }, // Minimal connections
  },
  cache: {
    ttl: 0,                   // Disable caching in tests
  },
  logging: {
    level: 'silent',          // No logging during tests
  },
  features: {
    enableDevTools: false,    // No dev tools in tests
    enableMockData: true,     // Use mock data
  }
}
```

## 🚀 Deployment Configuration

### Development Deployment
```bash
# deployment/dev.env
NODE_ENV=development
DATABASE_URL=postgresql://dev_user:dev_pass@dev-db:5432/employee_management_dev
FRONTEND_URL=https://dev.employee-management.com
JWT_SECRET=development-jwt-secret
LOG_LEVEL=debug
```

### Staging Deployment  
```bash
# deployment/staging.env
NODE_ENV=staging
DATABASE_URL=postgresql://staging_user:staging_pass@staging-db:5432/employee_management_staging
FRONTEND_URL=https://staging.employee-management.com
JWT_SECRET=staging-jwt-secret
LOG_LEVEL=info
```

### Production Deployment
```bash
# deployment/prod.env
NODE_ENV=production
DATABASE_URL=${PROD_DATABASE_URL}           # Injected by deployment system
FRONTEND_URL=https://employee-management.com
JWT_SECRET=${PROD_JWT_SECRET}               # Injected by secret manager
LOG_LEVEL=error
ENABLE_METRICS=true
```

## 🔍 Configuration Validation

### Startup Configuration Check
```typescript
// src/config/validator.ts
import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().url(),
});

export function validateConfig(config: Record<string, unknown>) {
  try {
    return configSchema.parse(config);
  } catch (error) {
    console.error('Configuration validation failed:', error);
    process.exit(1);
  }
}
```

### Environment Health Checks
```bash
# scripts/health-check.sh
#!/bin/bash

echo "🔍 Environment Health Check"
echo "=========================="

# Check required environment variables
REQUIRED_VARS=("NODE_ENV" "DATABASE_URL" "JWT_SECRET")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing required environment variable: $var"
        exit 1
    else
        echo "✅ $var is set"
    fi
done

# Test database connection
if npx pg-isready -d "$DATABASE_URL"; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    exit 1
fi

# Test Redis connection (if configured)
if [ -n "$REDIS_URL" ]; then
    if redis-cli -u "$REDIS_URL" ping > /dev/null; then
        echo "✅ Redis connection successful"
    else
        echo "❌ Redis connection failed"
        exit 1
    fi
fi

echo "✅ All health checks passed!"
```

## 🔧 Configuration Troubleshooting

### Common Configuration Issues

#### Port Conflicts
```bash
# Check if port is in use
lsof -i :3001
netstat -tulpn | grep :3001

# Solution: Change port in environment variables
PORT=3002
VITE_API_URL=http://localhost:3002/api
```

#### Database Connection Issues
```bash
# Test database connection
npx pg-isready -d "$DATABASE_URL"

# Common solutions:
# 1. Check if PostgreSQL is running
# 2. Verify connection string format
# 3. Check firewall/network configuration
# 4. Verify user permissions
```

#### CORS Issues
```bash
# Ensure CORS_ORIGIN matches frontend URL
CORS_ORIGIN=http://localhost:3000  # For development
CORS_ORIGIN=https://yourdomain.com # For production
```

### Environment Variable Debugging
```typescript
// Debug configuration in development
if (process.env.NODE_ENV === 'development') {
  console.log('🐛 Configuration Debug:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL?.replace(/\/\/.*:.*@/, '//***:***@'),
    JWT_SECRET: process.env.JWT_SECRET ? '***SET***' : '***NOT SET***',
    CORS_ORIGIN: process.env.CORS_ORIGIN,
  });
}
```

## 📋 Configuration Checklist

### Development Setup
- [ ] Copy `.env.example` to `.env`
- [ ] Set all required environment variables
- [ ] Verify database connection
- [ ] Test API endpoints
- [ ] Confirm frontend can connect to backend
- [ ] Run health check script

### Production Deployment
- [ ] Set production environment variables
- [ ] Use strong, unique secrets
- [ ] Enable HTTPS/TLS
- [ ] Configure proper CORS origins
- [ ] Set up monitoring and logging
- [ ] Test all integrations
- [ ] Verify security configurations
- [ ] Run comprehensive health checks

### Security Review
- [ ] No secrets in version control
- [ ] Strong JWT secret (256+ bits)
- [ ] Database passwords are complex
- [ ] CORS configured for production domains
- [ ] Rate limiting enabled
- [ ] HTTPS enforced in production
- [ ] Security headers configured
- [ ] Log levels appropriate for environment

---

**Configuration Version**: 1.0  
**Last Updated**: September 4, 2025  
**Maintainer**: DevOps Engineer  
**Review Required**: Before each deployment
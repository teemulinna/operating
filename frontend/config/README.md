# Environment Configuration Documentation

This document describes all environment variables and configuration options for the Employee Management System frontend.

## Environment Files

- `.env` - Default environment variables (loaded in development)
- `.env.example` - Template file showing all available variables
- `config/.env.development` - Development-specific variables
- `config/.env.production` - Production-specific variables  
- `config/.env.test` - Test-specific variables

## Required Environment Variables

### API Configuration
- `VITE_API_URL` - Backend API base URL
  - Development: `http://localhost:5000/api`
  - Production: `https://api.yourdomain.com/api`
  - Test: `http://localhost:5001/api`

### Server Configuration
- `VITE_PORT` - Frontend server port (default: 3000)
- `VITE_HOST` - Frontend server host (default: localhost)
- `NODE_ENV` - Environment mode (`development`, `production`, `test`)

### Development Tools
- `VITE_ENABLE_QUERY_DEVTOOLS` - Enable React Query DevTools
  - Development: `true`
  - Production: `false` 
  - Test: `false`

### Security
- `VITE_ENABLE_HTTPS` - Enable HTTPS connections
  - Development: `false`
  - Production: `true`
  - Test: `false`

## Optional Environment Variables

### Hot Module Replacement
- `VITE_HMR_PORT` - HMR port (default: 24678)

### Error Tracking
- `VITE_SENTRY_DSN` - Sentry error tracking DSN

### Logging
- `VITE_LOG_LEVEL` - Log level (`debug`, `info`, `warn`, `error`)

### Performance
- `VITE_ENABLE_PERFORMANCE_MONITORING` - Enable performance monitoring

### CDN & Assets
- `VITE_CDN_URL` - CDN base URL for static assets

### Content Security Policy
- `VITE_CSP_REPORT_URI` - CSP violation report endpoint

### Feature Flags
- `VITE_FEATURE_ANALYTICS` - Enable analytics tracking
- `VITE_FEATURE_DARK_MODE` - Enable dark mode feature

### Test Configuration
- `VITE_TEST_TIMEOUT` - Test timeout in milliseconds (default: 30000)
- `VITE_MOCK_API` - Use mock API in tests
- `TEST_DATABASE_URL` - Test database connection string
- `TEST_REDIS_URL` - Test Redis connection string

## Port Configuration

### Development Environment
- Frontend: `3000`
- Backend: `5000` 
- Database: `5432`
- Redis: `6379`
- HMR: `24678`

### Production Environment  
- Frontend: `80` (HTTP), `443` (HTTPS)
- Backend: `5000`
- Database: `5432` (internal)
- Redis: `6379` (internal)
- Traefik Dashboard: `8080`

### Test Environment
- Frontend: `3000`
- Backend: `5001`
- Database: `5433`
- Redis: `6380`

## Docker Compose Integration

### Development (`docker-compose.yml`)
```yaml
environment:
  - NODE_ENV=development
  - VITE_API_URL=http://backend:5000/api
  - VITE_PORT=3000
  - VITE_HOST=0.0.0.0
  - VITE_ENABLE_QUERY_DEVTOOLS=true
```

### Production (`docker-compose.prod.yml`)
```yaml
environment:
  - NODE_ENV=production
  - VITE_API_URL=https://api.yourdomain.com/api
  - VITE_PORT=3000
  - VITE_HOST=0.0.0.0
  - VITE_ENABLE_QUERY_DEVTOOLS=false
  - VITE_ENABLE_HTTPS=true
```

### Test (`docker-compose.test.yml`)
```yaml
environment:
  - NODE_ENV=test
  - VITE_API_URL=http://backend-test:5000/api
  - VITE_PORT=3000
  - VITE_HOST=0.0.0.0
  - VITE_ENABLE_QUERY_DEVTOOLS=false
  - VITE_TEST_TIMEOUT=30000
```

## Environment Validation

The application includes automatic environment validation at startup using `config/env-validation.ts`:

```typescript
import { getEnvironmentConfig, isDevelopment } from './config/env-validation'

// Get validated config
const config = getEnvironmentConfig()

// Check environment
if (isDevelopment()) {
  // Development-specific logic
}
```

## Common Issues & Solutions

### API Connection Issues
1. **Problem**: Frontend can't connect to backend
   - **Check**: `VITE_API_URL` matches backend port configuration
   - **Solution**: Ensure development uses `http://localhost:5000/api`

2. **Problem**: Docker container networking issues
   - **Check**: Docker Compose service names match URLs
   - **Solution**: Use service names (`http://backend:5000/api`) in Docker

### Port Conflicts
1. **Problem**: Port already in use
   - **Check**: Other services using same ports
   - **Solution**: Change `VITE_PORT` or stop conflicting services

2. **Problem**: HMR not working in Docker
   - **Check**: HMR port mapping and firewall
   - **Solution**: Ensure `VITE_HMR_PORT` is exposed

### Environment Loading Issues
1. **Problem**: Environment variables not loaded
   - **Check**: File names and locations
   - **Solution**: Ensure files are in correct directories with correct names

2. **Problem**: Build-time vs runtime variables
   - **Check**: Vite only loads `VITE_*` prefixed variables
   - **Solution**: Prefix all frontend variables with `VITE_`

## Security Considerations

1. **Never commit sensitive data** to `.env` files
2. **Use environment variable substitution** in production configs
3. **Validate all environment variables** at application startup
4. **Use HTTPS in production** (`VITE_ENABLE_HTTPS=true`)
5. **Set appropriate CORS origins** in backend configuration

## Troubleshooting Commands

```bash
# Check environment variable loading
npm run dev -- --mode development

# Validate configuration
npx vite --config vite.config.ts --mode production build

# Test with specific environment
NODE_ENV=test npm run test

# Docker environment debugging
docker-compose config
docker-compose logs frontend
```
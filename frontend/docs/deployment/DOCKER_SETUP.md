# Docker Setup and Configuration Guide

## Overview
This guide provides detailed information about the Docker configuration for the Employee Management System, including multi-stage builds, optimization strategies, and best practices.

## Container Architecture

### Multi-Stage Build Strategy
Our Docker images use multi-stage builds for:
- **Reduced image size**: Development dependencies excluded from production
- **Security**: Minimal attack surface in production images
- **Performance**: Optimized runtime environments
- **Flexibility**: Same Dockerfile for dev/staging/production

### Image Structure

#### Frontend Container
```dockerfile
# Base stage - shared dependencies
FROM node:18-alpine AS base

# Development stage - full dev environment
FROM node:18-alpine AS development

# Build stage - compile and optimize
FROM base AS build

# Production stage - minimal Nginx runtime
FROM nginx:alpine AS production
```

#### Backend Container
```dockerfile
# Base stage - production dependencies only
FROM node:18-alpine AS base

# Development stage - dev dependencies and hot reload
FROM node:18-alpine AS development

# Production stage - optimized runtime with dumb-init
FROM base AS production
```

## Environment Configurations

### Development (docker-compose.yml)
- **Purpose**: Local development with hot reload
- **Features**:
  - Volume mounts for live code changes
  - Development dependencies included
  - Debug logging enabled
  - Test database with sample data
  - Port forwarding for direct access

```yaml
services:
  frontend:
    target: development
    volumes:
      - ./src:/app/src:ro
      - ./public:/app/public:ro
    environment:
      - CHOKIDAR_USEPOLLING=true
```

### Testing (docker-compose.test.yml)
- **Purpose**: Automated testing in CI/CD
- **Features**:
  - Isolated test environment
  - In-memory databases (tmpfs)
  - Test-specific environment variables
  - Headless browser support for E2E tests

```yaml
services:
  database-test:
    tmpfs:
      - /var/lib/postgresql/data
    environment:
      - POSTGRES_DB=employee_management_test
```

### Production (docker-compose.prod.yml)
- **Purpose**: Production deployment
- **Features**:
  - Optimized images
  - Health checks
  - Resource limits
  - Persistent volumes
  - SSL/TLS support
  - Reverse proxy integration

```yaml
services:
  frontend:
    target: production
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
```

## Container Optimization

### Image Size Optimization
1. **Alpine Linux**: Minimal base images (~5MB vs ~100MB)
2. **Multi-stage builds**: Exclude dev dependencies
3. **Layer caching**: Optimized instruction order
4. **Dependency pruning**: Remove unused packages

### Performance Optimization
1. **Init system**: dumb-init for proper signal handling
2. **Non-root user**: Security and best practices
3. **Health checks**: Container orchestration support
4. **Resource limits**: Prevent resource exhaustion

### Security Optimization
1. **Minimal packages**: Reduced attack surface
2. **Non-privileged containers**: Run as node user
3. **Read-only filesystems**: Where possible
4. **Security scanning**: Trivy integration

## Networking

### Development Network
```yaml
networks:
  app-network:
    driver: bridge
```
- All services on same network
- Service discovery by name
- Port forwarding to host

### Production Network
```yaml
networks:
  app-network:
    external: true
  monitoring:
    internal: true
```
- External network for app services
- Internal monitoring network
- Traefik for reverse proxy

## Volume Management

### Development Volumes
- **Source code mounts**: Live reload capability
- **Node modules**: Performance optimization
- **Database data**: Persistent development data

### Production Volumes
- **Database persistence**: Critical data storage
- **File uploads**: User-generated content
- **SSL certificates**: HTTPS configuration
- **Logs**: Centralized log collection

### Backup Strategy
```bash
# Volume backup
docker run --rm \
  -v employee_management_postgres_data_prod:/data \
  -v /backup:/backup \
  alpine tar czf /backup/volumes_$(date +%Y%m%d).tar.gz -C /data .

# Volume restore
docker run --rm \
  -v employee_management_postgres_data_prod:/data \
  -v /backup:/backup \
  alpine tar xzf /backup/volumes_20231201.tar.gz -C /data
```

## Health Checks

### Application Health Checks
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1
```

### Database Health Checks
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD pg_isready -U ${POSTGRES_USER:-postgres} || exit 1
```

### Health Check Endpoints
- **Frontend**: `GET /health` - Returns nginx status
- **Backend**: `GET /api/health` - Database connectivity + service status
- **Database**: `pg_isready` - PostgreSQL ready check

## Environment Variables

### Security Best Practices
1. **Never hardcode secrets** in Dockerfiles
2. **Use Docker secrets** for sensitive data
3. **Environment-specific configs** in separate files
4. **Validation** of required environment variables

### Variable Categories

#### Application Configuration
```bash
NODE_ENV=production
PORT=5000
LOG_LEVEL=info
```

#### Database Configuration
```bash
DATABASE_URL=postgresql://user:pass@host:port/db
DB_HOST=database
DB_PORT=5432
```

#### Security Configuration
```bash
JWT_SECRET=${JWT_SECRET}
BCRYPT_ROUNDS=12
RATE_LIMIT_MAX_REQUESTS=100
```

## Docker Compose Profiles

### Using Profiles for Different Scenarios
```bash
# Development with monitoring
docker-compose --profile monitoring up

# Production without monitoring
docker-compose --profile production up

# Full stack including monitoring
docker-compose --profile full up
```

### Profile Configuration
```yaml
services:
  monitoring:
    profiles: ["monitoring", "full"]
  
  app:
    profiles: ["production", "development", "full"]
```

## Maintenance and Updates

### Image Updates
```bash
# Pull latest base images
docker-compose pull

# Rebuild with latest base
docker-compose build --pull

# Update and restart
docker-compose up -d --force-recreate
```

### Container Cleanup
```bash
# Remove unused images
docker image prune -f

# Remove unused volumes
docker volume prune -f

# Complete cleanup
docker system prune -af --volumes
```

### Log Management
```bash
# Configure log rotation
echo '{"log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"3"}}' > /etc/docker/daemon.json

# View container logs
docker-compose logs -f --tail=100 [service]

# Log cleanup
docker logs [container] 2>/dev/null | tail -1000 > logs.txt
```

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear build cache
docker builder prune -af

# Build without cache
docker-compose build --no-cache

# Check build context
docker build --progress=plain .
```

#### Runtime Issues
```bash
# Check container status
docker-compose ps

# Execute into container
docker-compose exec [service] sh

# Check resource usage
docker stats [container]
```

#### Network Issues
```bash
# List networks
docker network ls

# Inspect network
docker network inspect [network_name]

# Test connectivity
docker-compose exec [service] ping [other_service]
```

### Performance Tuning

#### Container Resources
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

#### Database Optimization
```yaml
services:
  database:
    command: postgres -c shared_buffers=256MB -c effective_cache_size=1GB
    shm_size: 256mb
```

## Best Practices Summary

1. **Use multi-stage builds** for optimal image size
2. **Implement health checks** for all services
3. **Run as non-root user** for security
4. **Use specific tags** instead of 'latest'
5. **Minimize layers** in Dockerfiles
6. **Order instructions** for better caching
7. **Use .dockerignore** to exclude unnecessary files
8. **Implement proper logging** and monitoring
9. **Regular security updates** for base images
10. **Test locally** before deploying to production
# Employee Management System - Deployment Guide

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Testing](#testing)
- [Staging Deployment](#staging-deployment)
- [Production Deployment](#production-deployment)
- [Monitoring & Observability](#monitoring--observability)
- [Security](#security)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)

## Overview

This guide covers the complete deployment process for the Employee Management System, including:
- Containerized deployment with Docker
- CI/CD pipeline with GitHub Actions
- Multi-environment configuration
- Monitoring and observability
- Security scanning and compliance
- Backup and disaster recovery

## Prerequisites

### Development Environment
- Docker Desktop 4.0+ with Docker Compose
- Node.js 18+ and npm
- Git
- VS Code (recommended)

### Production Environment
- Linux server (Ubuntu 20.04+ recommended)
- Docker Engine 20.10+
- Docker Compose 2.0+
- Reverse proxy (Nginx/Traefik)
- SSL certificates
- Domain name with DNS configuration

### Required Secrets
Set these in GitHub Secrets and environment variables:

```bash
# Database
DB_PASSWORD=your_secure_db_password

# JWT
JWT_SECRET=your_jwt_secret_key

# Email
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASSWORD=your_smtp_password
FROM_EMAIL=noreply@yourdomain.com

# External Services
SNYK_TOKEN=your_snyk_token
SLACK_WEBHOOK_URL=your_slack_webhook

# Server Access
STAGING_HOST=staging.yourdomain.com
STAGING_USER=deploy
STAGING_SSH_KEY=your_staging_private_key
PRODUCTION_HOST=yourdomain.com
PRODUCTION_USER=deploy
PRODUCTION_SSH_KEY=your_production_private_key
```

## Local Development

### Quick Start
```bash
# Clone repository
git clone https://github.com/yourusername/employee-management.git
cd employee-management

# Start development environment
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Development URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Database: localhost:5432
- Redis: localhost:6379

### Hot Reload
The development setup includes hot reload for both frontend and backend:
- Frontend: Uses Create React App's built-in hot reload
- Backend: Uses nodemon for automatic restarts

## Testing

### Unit Tests
```bash
# Frontend tests
npm test

# Backend tests
cd backend && npm test

# With coverage
npm run test:coverage
cd backend && npm run test:coverage
```

### Integration Tests
```bash
# Run full test suite with Docker
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit

# Clean up
docker-compose -f docker-compose.test.yml down -v
```

### E2E Tests
```bash
# Run Cypress tests
npm run test:e2e

# Run headless
npm run test:e2e:headless
```

## Staging Deployment

### Automatic Deployment
Pushes to `develop` branch automatically deploy to staging via GitHub Actions.

### Manual Deployment
```bash
# SSH to staging server
ssh deploy@staging.yourdomain.com

# Navigate to project
cd /opt/employee-management

# Run deployment script
./deployment/scripts/deploy-staging.sh
```

### Staging Environment
- URL: https://staging.yourdomain.com
- API: https://staging-api.yourdomain.com
- Database: Fresh data with test seeds
- Features: All development features enabled

## Production Deployment

### Release Process
1. Create a release in GitHub
2. CI/CD pipeline automatically builds and tests
3. Manual approval required for production deployment
4. Rolling deployment with health checks
5. Automatic rollback on failure

### Manual Deployment
```bash
# SSH to production server
ssh deploy@yourdomain.com

# Navigate to project
cd /opt/employee-management

# Run deployment script with version
./deployment/scripts/deploy-production.sh v1.2.3
```

### Deployment Features
- **Zero-downtime deployment**: Rolling update strategy
- **Health checks**: Service validation before traffic routing
- **Automatic rollback**: On deployment failure
- **Database migrations**: Automatic schema updates
- **Backup creation**: Before each deployment

### Production URLs
- Frontend: https://yourdomain.com
- API: https://api.yourdomain.com
- Admin Panel: https://admin.yourdomain.com

## Monitoring & Observability

### Monitoring Stack
```bash
# Start monitoring services
docker-compose -f deployment/configs/docker-compose.monitoring.yml up -d
```

### Services
- **Prometheus**: Metrics collection (port 9090)
- **Grafana**: Dashboards and visualization (port 3001)
- **Loki**: Log aggregation (port 3100)
- **AlertManager**: Alert routing (port 9093)

### Key Metrics
- Application response time
- Error rates and status codes
- Database performance
- System resources (CPU, memory, disk)
- Container health

### Alerts
Configured alerts for:
- High error rates (>10% 5xx responses)
- High memory usage (>85%)
- High CPU usage (>80%)
- Service downtime
- Database connectivity issues

### Dashboards
Pre-configured Grafana dashboards for:
- Application Overview
- System Metrics
- Database Performance
- Container Metrics
- Business Metrics

## Security

### Security Scanning
Automated security scans run on:
- Every pull request
- Daily scheduled scans
- Release builds

### Scan Types
- **Dependency vulnerabilities**: npm audit, Snyk
- **Container security**: Trivy scanner
- **Static code analysis**: CodeQL
- **Secret detection**: GitLeaks
- **License compliance**: license-checker

### Security Features
- JWT authentication with refresh tokens
- Password hashing with bcrypt
- Rate limiting
- CORS configuration
- Security headers
- SSL/TLS encryption
- Container security best practices

### Compliance
- GDPR compliance for EU users
- SOC 2 Type II controls
- Regular security assessments
- Vulnerability disclosure process

## Backup & Recovery

### Automated Backups
```bash
# Database backup (runs daily via cron)
./deployment/scripts/backup-database.sh production

# Manual backup
./deployment/scripts/backup-database.sh production
```

### Backup Strategy
- **Daily backups**: Retained for 30 days (production)
- **Weekly backups**: Retained for 12 weeks
- **Monthly backups**: Retained for 12 months
- **Off-site storage**: AWS S3 with encryption

### Disaster Recovery
```bash
# Restore from backup
./deployment/scripts/restore-database.sh /path/to/backup.sql production

# Complete system restore
# 1. Restore infrastructure
# 2. Restore application code
# 3. Restore database
# 4. Restore uploaded files
# 5. Update DNS if needed
```

### Recovery Objectives
- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 1 hour
- **Data retention**: 12 months minimum

## Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs [service_name]

# Restart specific service
docker-compose restart [service_name]
```

#### Database Connection Issues
```bash
# Check database status
docker-compose exec database pg_isready -U app_user

# Connect to database
docker-compose exec database psql -U app_user -d employee_management

# Check connection from backend
docker-compose exec backend npm run db:test
```

#### Performance Issues
```bash
# Check resource usage
docker stats

# Monitor database queries
docker-compose exec database psql -U app_user -d employee_management -c "SELECT * FROM pg_stat_activity;"

# Check application metrics
curl http://localhost:5000/api/metrics
```

### Log Analysis
```bash
# Application logs
docker-compose logs -f backend frontend

# Database logs
docker-compose logs -f database

# System logs
journalctl -u docker

# Access Grafana logs via Loki
# Visit http://localhost:3001 and explore logs
```

### Emergency Procedures

#### Complete System Failure
1. Check infrastructure status
2. Review monitoring alerts
3. Restore from latest backup
4. Communicate with stakeholders
5. Conduct post-incident review

#### Security Breach
1. Isolate affected systems
2. Preserve evidence
3. Assess impact
4. Implement fixes
5. Update security measures
6. Notify affected users

### Support Contacts
- **Technical Lead**: tech-lead@yourdomain.com
- **DevOps Team**: devops@yourdomain.com
- **Security Team**: security@yourdomain.com
- **On-call**: +1-xxx-xxx-xxxx

## Additional Resources
- [API Documentation](../api/README.md)
- [Development Guide](../development/README.md)
- [Security Policy](../security/SECURITY.md)
- [Contributing Guidelines](../../CONTRIBUTING.md)
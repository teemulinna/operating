# Employee Management System - Quick Start Guide

## 🚀 Getting Started

This guide will help you set up and run the complete Employee Management System on your local machine.

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Docker** and Docker Compose
- **Git** for version control
- **PostgreSQL** (optional - Docker will handle this)

## ⚡ Quick Setup (5 minutes)

### 1. Clone and Install
```bash
git clone <repository-url>
cd frontend
npm install
```

### 2. Fix Missing Dependencies (Required)
```bash
# Install missing frontend dependencies
npm install @radix-ui/react-label react-error-boundary

# Install missing backend type definitions
npm install --save-dev @types/swagger-ui-express @types/swagger-jsdoc
```

### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
VITE_API_URL=http://localhost:3001/api
VITE_NODE_ENV=development
```

### 4. Start Services with Docker
```bash
# Build and start all services
docker-compose up --build

# Or start in background
docker-compose up -d --build
```

### 5. Initialize Database (First Time Only)
```bash
# Database will auto-initialize with schema and seed data
# Check logs to ensure successful initialization
docker-compose logs database
```

## 🐳 Docker Services

The system runs 4 main services:

| Service | Port | Description |
|---------|------|-------------|
| **frontend** | 3000 | React SPA application |
| **backend** | 3001 | Express.js API server |
| **database** | 5432 | PostgreSQL database |
| **redis** | 6379 | Cache and session store |

## 🔧 Development Workflow

### Frontend Development
```bash
# Run frontend in development mode
npm run dev

# Run tests
npm test
npm run test:e2e
```

### Backend Development
```bash
# Backend runs automatically in Docker
# For local backend development:
cd backend && npm run dev
```

### Database Management
```bash
# Connect to database
docker exec -it frontend-database-1 psql -U app_user -d employee_management

# View logs
docker-compose logs database

# Reset database (removes all data!)
docker-compose down -v
docker-compose up database
```

## 🧪 Testing the System

### 1. Verify Services are Running
```bash
# Check all containers are healthy
docker-compose ps

# Test API health endpoint
curl http://localhost:3001/health

# Test frontend
open http://localhost:3000
```

### 2. Test API Endpoints
```bash
# Get all employees
curl http://localhost:3001/api/employees

# Create test employee
curl -X POST http://localhost:3001/api/employees \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "position": "Developer",
    "department": "Engineering",
    "salary": 75000,
    "startDate": "2024-01-15"
  }'
```

### 3. Run Test Suites
```bash
# Unit and integration tests
npm test

# End-to-end tests (requires services running)
npm run test:e2e

# Performance tests
npm run test:performance
```

## 📊 Using the Application

### Employee Management Features
1. **View Employees**: Browse paginated employee list
2. **Add Employee**: Create new employee records
3. **Edit Employee**: Update existing employee data
4. **Search & Filter**: Find employees by various criteria
5. **CSV Import/Export**: Bulk operations with spreadsheet files

### API Documentation
- **Swagger UI**: http://localhost:3001/api-docs
- **API Endpoints**: 42+ REST endpoints for complete functionality

## 🔍 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# If port 5432 is in use
docker-compose down
# Change port in docker-compose.yml database service
ports: ["5433:5432"]
# Update connection string accordingly
```

#### Dependencies Missing
```bash
# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### Docker Build Issues
```bash
# Clean Docker cache
docker system prune -f
docker-compose build --no-cache
```

#### TypeScript Errors
```bash
# Ensure all dependencies are installed
npm install
npm run build
```

### Service Health Checks

#### Database Health
```bash
# Check database connection
docker exec frontend-database-1 pg_isready -U app_user

# View database logs
docker-compose logs database
```

#### API Health
```bash
# Test API server
curl -f http://localhost:3001/health || echo "API Down"

# Check API logs
docker-compose logs backend
```

#### Frontend Health
```bash
# Test frontend
curl -f http://localhost:3000 || echo "Frontend Down"

# Check frontend logs
docker-compose logs frontend
```

## 🏗️ Architecture Overview

```
Frontend (React) → API (Express.js) → Database (PostgreSQL)
     ↓                   ↓                    ↓
   Port 3000         Port 3001          Port 5432
   React Query       REST API           Relational DB
   TypeScript        Middleware         Migrations
   Components        Controllers        Models
```

## 🚀 Production Deployment

### Environment Variables
```bash
# Production environment
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-host:5432/employee_db
JWT_SECRET=your-secure-secret-key
FRONTEND_URL=https://your-domain.com
```

### Build for Production
```bash
# Build optimized frontend
npm run build

# Build production Docker images
docker-compose -f docker-compose.prod.yml build

# Deploy with production config
docker-compose -f docker-compose.prod.yml up -d
```

## 📚 Additional Resources

- **API Documentation**: [API_STRUCTURE.md](./API_STRUCTURE.md)
- **Integration Report**: [INTEGRATION_VERIFICATION_REPORT.md](./INTEGRATION_VERIFICATION_REPORT.md)
- **Testing Guide**: [tests/README.md](../tests/README.md)
- **Deployment Guide**: [deployment/README.md](../deployment/README.md)

## 🆘 Getting Help

### Check System Status
```bash
# Quick health check
./scripts/health-check.sh

# Detailed system information
docker-compose ps
docker stats
npm run test:integration
```

### Common Commands Summary
```bash
# Full system reset
docker-compose down -v && docker-compose up --build -d

# Watch logs
docker-compose logs -f

# Database reset
docker-compose restart database

# Rebuild services
docker-compose build --no-cache [service-name]
```

### Support
- Review the integration report for known issues
- Check Docker and service logs
- Ensure all dependencies are installed
- Verify environment configuration

---

**Last Updated:** September 4, 2025  
**Version:** 1.0.0  
**Status:** Beta - Integration fixes required
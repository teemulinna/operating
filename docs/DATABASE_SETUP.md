# Database Foundation Setup Guide

This document outlines the complete database foundation for the Employee Management System, implemented using Test-Driven Development (TDD) principles.

## 🏗️ Database Architecture

### Core Tables

1. **departments** - Organization departments
2. **skills** - Available skills with categories  
3. **employees** - Employee records with department association
4. **employee_skills** - Many-to-many mapping of employees to skills with proficiency
5. **capacity_history** - Historical capacity and utilization tracking

### Key Features

- **UUID Primary Keys** - All tables use UUID for better distribution and security
- **Soft Deletes** - Uses `is_active` flags instead of hard deletes
- **Automatic Timestamps** - All tables have `created_at` and `updated_at`
- **Comprehensive Indexing** - Strategic indexes for optimal query performance
- **Data Integrity** - Foreign key constraints and check constraints
- **Computed Columns** - Automatic utilization rate calculation

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

### Installation

```bash
# Clone and install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your database credentials
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=employee_management
# DB_USER=postgres
# DB_PASSWORD=password
```

### Database Setup

```bash
# Create database
createdb employee_management

# Run migrations
npm run migrate

# Seed with sample data
npm run seed

# Build and test
npm run build
npm test
```

### Test Database Operations

```bash
# Run comprehensive database test
npx ts-node scripts/test-database.ts
```

## 📊 Database Schema

### Departments Table

```sql
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    manager_id UUID REFERENCES employees(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Skills Table

```sql
CREATE TYPE skill_category AS ENUM ('technical', 'soft', 'language', 'certification', 'domain');

CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category skill_category NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Employees Table

```sql
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    department_id UUID NOT NULL REFERENCES departments(id),
    position VARCHAR(100) NOT NULL,
    hire_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Employee Skills Table

```sql
CREATE TYPE proficiency_level AS ENUM ('1', '2', '3', '4', '5');

CREATE TABLE employee_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency_level proficiency_level NOT NULL,
    years_of_experience INTEGER NOT NULL CHECK (years_of_experience >= 0),
    last_assessed DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, skill_id)
);
```

### Capacity History Table

```sql
CREATE TABLE capacity_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    available_hours DECIMAL(5,2) NOT NULL CHECK (available_hours >= 0),
    allocated_hours DECIMAL(5,2) NOT NULL CHECK (allocated_hours >= 0),
    utilization_rate DECIMAL(5,4) NOT NULL GENERATED ALWAYS AS (
        CASE 
            WHEN available_hours > 0 THEN allocated_hours / available_hours 
            ELSE 0 
        END
    ) STORED,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, date),
    CHECK (allocated_hours <= available_hours)
);
```

## 🔧 TypeScript Models

### Model Features

- **Type Safety** - Full TypeScript interfaces and validation
- **Business Logic** - Methods for complex queries and operations  
- **Error Handling** - Comprehensive error handling with custom DatabaseError class
- **Validation** - Input validation using Joi schemas
- **Statistics** - Built-in methods for analytics and reporting
- **Bulk Operations** - Support for batch inserts and updates

### Usage Example

```typescript
import { EmployeeModel, DepartmentModel, SkillModel } from './src/models';

// Create a department
const department = await DepartmentModel.create({
  name: 'Engineering',
  description: 'Software development team'
});

// Create an employee
const employee = await EmployeeModel.create({
  firstName: 'John',
  lastName: 'Doe', 
  email: 'john.doe@company.com',
  departmentId: department.id,
  position: 'Senior Developer',
  hireDate: new Date('2023-01-15')
});

// Get employee with skills and department
const employeeDetails = await EmployeeModel.findByIdWithDetails(employee.id);
```

## 🧪 Testing Strategy

### Test Coverage

- **Unit Tests** - Individual model operations
- **Integration Tests** - Cross-model operations and constraints
- **Performance Tests** - Query performance and bulk operations
- **Validation Tests** - Input validation and business rules
- **Error Handling Tests** - Database errors and constraint violations

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run integration tests only
npm test tests/integration

# Run unit tests only
npm test tests/unit
```

## 📈 Performance Optimizations

### Indexing Strategy

- **Primary Keys** - UUID primary keys on all tables
- **Foreign Keys** - Indexes on all foreign key columns
- **Unique Constraints** - Unique indexes for email, department names, skill names
- **Composite Indexes** - Multi-column indexes for common query patterns
- **Partial Indexes** - Conditional indexes for active records only

### Query Optimizations

- **Connection Pooling** - Configurable connection pool sizing
- **Prepared Statements** - Parameterized queries for performance
- **Batch Operations** - Support for bulk inserts and updates
- **Pagination** - Efficient pagination with LIMIT/OFFSET
- **JSON Aggregation** - Using PostgreSQL JSON functions for complex queries

## 🛡️ Security Features

### Data Protection

- **SQL Injection Prevention** - Parameterized queries throughout
- **Input Validation** - Comprehensive Joi validation schemas
- **Email Format Validation** - Regex validation for email addresses
- **Constraint Enforcement** - Database-level constraints and checks
- **Soft Deletes** - Preserves data integrity with logical deletes

### Access Control

- **Connection Security** - SSL support for database connections
- **Environment Variables** - Secure configuration management
- **Error Sanitization** - Safe error messages without sensitive data

## 📊 Seeded Data

### Departments (10)
- Engineering, Human Resources, Marketing, Sales, Finance, Operations, Product, Design, Data Science, Quality Assurance

### Skills (70+)
- **Technical** - JavaScript, TypeScript, Python, Java, React, etc.
- **Soft Skills** - Leadership, Communication, Problem Solving, etc.
- **Languages** - English, Spanish, French, German, etc.
- **Certifications** - AWS, Google Cloud, PMP, etc.
- **Domain Knowledge** - FinTech, Healthcare, E-commerce, etc.

## 🚀 Next Steps

1. **API Layer** - Build REST API endpoints
2. **Authentication** - Add user authentication system
3. **Authorization** - Role-based access control
4. **Caching** - Redis integration for performance
5. **Monitoring** - Database performance monitoring
6. **Backup Strategy** - Automated backup procedures

## 🔍 Troubleshooting

### Common Issues

1. **Connection Errors** - Check database credentials in `.env`
2. **Migration Failures** - Ensure database exists and user has permissions
3. **Test Failures** - Verify test database is separate from development
4. **Performance Issues** - Check indexes and query patterns

### Debug Commands

```bash
# Check migration status
npx ts-node migrations/migrate.ts status

# Test database connection
npx ts-node scripts/test-database.ts

# Run type checking
npm run typecheck

# Check for linting issues  
npm run lint
```

---

**Database Foundation Status: ✅ COMPLETED**

All 8 subtasks completed successfully:
- ✅ Comprehensive test suite
- ✅ Complete PostgreSQL schema  
- ✅ Migration system with proper indexing
- ✅ TypeScript models and interfaces
- ✅ Data validation and business logic
- ✅ Seed data for departments and skills
- ✅ Database connection and configuration
- ✅ Verified operations with test runner
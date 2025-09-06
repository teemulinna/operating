# Spec Requirements Document

> Spec: Project-Resource Integration System
> Created: 2025-09-06
> Status: Planning
> Dependencies: Employee Management System (completed), Resource Planning Dashboard (in progress)

## Overview

Transform the existing Employee Management and Resource Planning systems into a comprehensive project-centric resource management platform where projects define resource needs (roles), employees/contractors are assigned to fulfill those roles across multiple projects, with full lifecycle management from planning through actual tracking and reporting.

## Core Business Logic

### Project-Resource Relationship Model
```
Project → Project Roles (positions needed) → Resource Assignments (actual people) → Time Allocations (when/how much)
```

**Key Principles:**
- **Project-Centric**: Projects define what resources they need (roles/skills)
- **Multi-Assignment**: One employee can work on multiple projects simultaneously
- **Time-Bound**: Every assignment has start/end dates and allocation percentages
- **Capacity-Aware**: System prevents over-allocation based on employee capacity
- **Actuals Tracking**: Compare planned vs actual time/effort spent

## User Stories

### 1. Project Resource Planning
**As a Project Manager, I want to define what roles/skills my project needs over time, so that I can plan resource requirements before assigning specific people.**

The PM creates a project and defines required roles (e.g., "Senior React Developer", "UX Designer", "Backend Engineer") with:
- Time periods needed (start/end dates)
- Allocation requirements (full-time, part-time percentages)
- Required skills/competency levels
- Placeholder resource planning before specific assignments

### 2. Resource Assignment to Projects
**As a Resource Manager, I want to assign specific employees to project roles based on skills and availability, so that projects get the right people at the right time.**

The system shows:
- Available employees matching required skills
- Current capacity and utilization rates
- Conflicting assignments and over-allocation warnings
- Drag-and-drop assignment interface
- Bulk assignment capabilities for team movements

### 3. Multi-Project Employee View
**As an Employee/Manager, I want to see all projects I'm assigned to with time allocations, so that I understand my full workload across initiatives.**

Employee dashboard shows:
- All current project assignments with percentages
- Timeline view of project overlap and transitions
- Total utilization across all projects
- Upcoming project starts/ends
- Skills being utilized across projects

### 4. Cross-Project Resource Optimization
**As a Resource Manager, I want to view resource allocation across all projects, so that I can optimize utilization and identify conflicts or gaps.**

Portfolio view displays:
- All projects with resource needs and assignments
- Employee utilization across multiple projects
- Resource conflicts and over-allocations
- Available capacity for new project assignments
- Skills gaps and hiring needs

### 5. Planned vs Actual Reporting
**As a Project Manager, I want to track actual time spent vs planned allocations, so that I can improve future resource planning accuracy.**

Reporting system provides:
- Planned allocation vs actual time tracking
- Project resource burn rates
- Employee productivity across different projects
- Resource planning accuracy metrics
- Variance analysis and insights

## Technical Architecture

### Database Schema Extensions

#### Projects Table
```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL, -- Human-readable project code (e.g., "PROJ-2025-001")
    name VARCHAR(200) NOT NULL,
    description TEXT,
    client_id UUID, -- Future: client management
    start_date DATE NOT NULL,
    end_date DATE,
    status project_status NOT NULL DEFAULT 'planning',
    budget DECIMAL(12,2), -- Total project budget
    currency_code VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

CREATE TYPE project_status AS ENUM ('planning', 'active', 'on-hold', 'completed', 'cancelled');
```

#### Project Roles Table
```sql
CREATE TABLE project_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    role_name VARCHAR(100) NOT NULL, -- e.g., "Senior React Developer"
    description TEXT,
    required_skills UUID[], -- Array of skill IDs
    minimum_experience_level experience_level,
    start_date DATE NOT NULL,
    end_date DATE,
    allocation_percentage DECIMAL(5,2) NOT NULL CHECK (allocation_percentage > 0 AND allocation_percentage <= 100),
    hourly_rate DECIMAL(8,2), -- For budgeting
    is_filled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Resource Assignments Table
```sql
CREATE TABLE resource_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    project_role_id UUID REFERENCES project_roles(id) ON DELETE SET NULL,
    assignment_type assignment_type NOT NULL DEFAULT 'employee',
    start_date DATE NOT NULL,
    end_date DATE,
    planned_allocation_percentage DECIMAL(5,2) NOT NULL CHECK (planned_allocation_percentage > 0 AND planned_allocation_percentage <= 100),
    actual_allocation_percentage DECIMAL(5,2) CHECK (actual_allocation_percentage >= 0 AND actual_allocation_percentage <= 100),
    hourly_rate DECIMAL(8,2), -- Override project role rate if needed
    status assignment_status NOT NULL DEFAULT 'planned',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    UNIQUE(project_id, employee_id, start_date) -- Prevent duplicate assignments on same date
);

CREATE TYPE assignment_type AS ENUM ('employee', 'contractor', 'consultant');
CREATE TYPE assignment_status AS ENUM ('planned', 'active', 'completed', 'cancelled');
```

#### Time Tracking Table (Actuals)
```sql
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_assignment_id UUID NOT NULL REFERENCES resource_assignments(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    work_date DATE NOT NULL,
    hours_worked DECIMAL(4,2) NOT NULL CHECK (hours_worked >= 0),
    description TEXT,
    billable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource_assignment_id, work_date)
);
```

### API Endpoints

#### Project Management
```typescript
// Project CRUD
POST   /api/projects                    // Create project
GET    /api/projects                    // List projects with filtering
GET    /api/projects/:id                // Get project details
PUT    /api/projects/:id                // Update project
DELETE /api/projects/:id                // Delete project

// Project roles
POST   /api/projects/:id/roles          // Add role to project
GET    /api/projects/:id/roles          // List project roles
PUT    /api/projects/:id/roles/:roleId  // Update role
DELETE /api/projects/:id/roles/:roleId  // Remove role

// Resource assignments
POST   /api/projects/:id/assignments    // Assign employee to project
GET    /api/projects/:id/assignments    // List project assignments
PUT    /api/assignments/:id             // Update assignment
DELETE /api/assignments/:id             // Remove assignment
```

#### Resource Planning & Optimization
```typescript
// Capacity planning
GET    /api/resources/availability       // Get available resources for date range
GET    /api/resources/capacity/:employeeId // Get employee capacity across projects
GET    /api/resources/conflicts          // Find resource conflicts and over-allocations
POST   /api/resources/optimize          // Get optimization suggestions

// Multi-project views
GET    /api/employees/:id/assignments    // All assignments for employee
GET    /api/employees/:id/utilization    // Employee utilization across projects
GET    /api/projects/portfolio           // Portfolio view of all projects and resources
```

#### Reporting & Analytics
```typescript
// Planned vs Actual reporting
GET    /api/reports/planned-vs-actual/:projectId  // Project resource variance
GET    /api/reports/utilization                   // Resource utilization reports  
GET    /api/reports/project-performance           // Project resource performance
GET    /api/reports/resource-forecast             // Future resource needs
```

### Frontend Components Architecture

#### 1. Project Management Interface
- **Project Creation Wizard**: Multi-step form for project setup with role definition
- **Project Portfolio Dashboard**: Grid/card view of all projects with resource status
- **Project Detail Page**: Full project view with roles, assignments, timeline

#### 2. Resource Assignment Interface  
- **Resource Planning Board**: Kanban-style board showing projects → roles → assignments
- **Assignment Matrix**: Grid showing employees vs projects with allocation percentages
- **Drag-and-Drop Scheduler**: Visual timeline for assigning people to project phases

#### 3. Employee Multi-Project Views
- **Employee Dashboard**: Personal view showing all project assignments and utilization
- **Team Utilization View**: Manager view of team members across multiple projects
- **Skills-Based Matching**: Interface to find best-fit employees for project roles

#### 4. Reporting & Analytics
- **Planned vs Actual Dashboard**: Charts comparing planned allocation vs actual time
- **Resource Utilization Reports**: Utilization trends and optimization opportunities
- **Project Resource Performance**: ROI and efficiency metrics per project

## Implementation Phases

### Phase 1: Core Project-Resource Foundation (4-6 weeks)
- Database schema implementation (projects, project_roles, resource_assignments)
- Basic project CRUD operations
- Simple resource assignment functionality
- Employee multi-project view

### Phase 2: Advanced Planning & Optimization (4-6 weeks)
- Project role definition with skills requirements
- Capacity-aware assignment system with conflict detection
- Visual resource assignment interfaces (drag-and-drop)
- Resource optimization algorithms

### Phase 3: Reporting & Actuals (4-6 weeks) 
- Time tracking integration (planned vs actual)
- Comprehensive reporting dashboard
- Resource performance analytics
- Forecasting and planning tools

### Phase 4: Advanced Features & Integration (6-8 weeks)
- Scenario planning ("what-if" modeling)
- External tool integrations (CRM, time tracking)
- AI-powered resource optimization
- Mobile interfaces for resource management

## Success Metrics

### Business Impact
- **Planning Efficiency**: 60% reduction in time spent on resource planning
- **Utilization Optimization**: 15-25% improvement in resource utilization
- **Over-allocation Prevention**: 95% reduction in resource conflicts
- **Planning Accuracy**: 80% accuracy between planned and actual resource allocation

### User Experience
- **Setup Time**: < 15 minutes to configure first project with resource assignments
- **Assignment Speed**: < 2 minutes to assign employee to project role
- **Conflict Detection**: Real-time warnings for resource conflicts
- **Multi-project Visibility**: Clear view of employee utilization across all projects

## Integration Points

### Existing System Integration
- **Employee Management**: Leverage existing employee profiles and skills data
- **Capacity System**: Build on current capacity tracking for availability calculations
- **Resource Dashboard**: Extend existing dashboard with project-centric views

### Future Integration Opportunities
- **Time Tracking Tools**: Harvest, Toggl, Clockify for actuals data
- **Project Management**: Jira, Asana, Monday.com for project synchronization
- **CRM Systems**: Salesforce, HubSpot for client project pipeline
- **Financial Systems**: QuickBooks, NetSuite for project budgeting

This comprehensive project-resource integration system transforms isolated employee management into a complete resource planning ecosystem focused on project delivery success and resource optimization.
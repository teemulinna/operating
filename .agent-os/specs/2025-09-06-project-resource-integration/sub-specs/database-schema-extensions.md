# Database Schema Extensions for Project-Resource Integration

> Extension of: @.agent-os/specs/2025-09-03-employee-management/sub-specs/database-schema.md
> Created: 2025-09-06
> Version: 2.0.0

## Overview

This schema extends the existing employee management system with project-centric resource planning capabilities. The design maintains compatibility with existing employee, skills, and capacity systems while adding project management, role definitions, and resource assignments.

## New Tables

### 1. Projects
Central table for all projects requiring resources.

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL, -- Human-readable project code
    name VARCHAR(200) NOT NULL,
    description TEXT,
    client_name VARCHAR(200), -- Simplified client reference for now
    start_date DATE NOT NULL,
    end_date DATE,
    status project_status NOT NULL DEFAULT 'planning',
    priority project_priority NOT NULL DEFAULT 'medium',
    budget DECIMAL(12,2),
    currency_code VARCHAR(3) DEFAULT 'USD',
    estimated_hours INTEGER, -- Total estimated project hours
    actual_hours DECIMAL(8,2) DEFAULT 0, -- Actual hours tracked
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    
    -- Constraints
    CONSTRAINT chk_project_dates CHECK (end_date IS NULL OR start_date <= end_date),
    CONSTRAINT chk_project_budget CHECK (budget IS NULL OR budget >= 0),
    CONSTRAINT chk_project_hours CHECK (estimated_hours IS NULL OR estimated_hours > 0)
);

-- Project status and priority enums
CREATE TYPE project_status AS ENUM ('planning', 'active', 'on-hold', 'completed', 'cancelled');
CREATE TYPE project_priority AS ENUM ('low', 'medium', 'high', 'critical');
```

### 2. Project Roles
Defines what roles/positions each project needs.

```sql
CREATE TABLE project_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    required_skills UUID[] DEFAULT '{}', -- Array of skill IDs from existing skills table
    minimum_experience_level experience_level,
    start_date DATE NOT NULL,
    end_date DATE,
    planned_allocation_percentage DECIMAL(5,2) NOT NULL 
        CHECK (planned_allocation_percentage > 0 AND planned_allocation_percentage <= 100),
    estimated_hours INTEGER, -- Hours needed for this role
    hourly_rate DECIMAL(8,2), -- For budgeting calculations
    is_filled BOOLEAN DEFAULT FALSE,
    filled_by UUID REFERENCES employees(id) ON DELETE SET NULL, -- Quick reference to assigned employee
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_role_dates CHECK (end_date IS NULL OR start_date <= end_date),
    CONSTRAINT chk_role_hours CHECK (estimated_hours IS NULL OR estimated_hours > 0),
    CONSTRAINT chk_role_rate CHECK (hourly_rate IS NULL OR hourly_rate >= 0)
);
```

### 3. Resource Assignments
Links employees to projects with time allocations.

```sql
CREATE TABLE resource_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    project_role_id UUID REFERENCES project_roles(id) ON DELETE SET NULL,
    assignment_type assignment_type NOT NULL DEFAULT 'employee',
    start_date DATE NOT NULL,
    end_date DATE,
    planned_allocation_percentage DECIMAL(5,2) NOT NULL 
        CHECK (planned_allocation_percentage > 0 AND planned_allocation_percentage <= 100),
    actual_allocation_percentage DECIMAL(5,2) 
        CHECK (actual_allocation_percentage IS NULL OR (actual_allocation_percentage >= 0 AND actual_allocation_percentage <= 100)),
    planned_hours_per_week DECIMAL(4,1) GENERATED ALWAYS AS (
        (planned_allocation_percentage / 100.0) * 40.0
    ) STORED, -- Assuming 40-hour work week
    hourly_rate DECIMAL(8,2), -- Can override project role rate
    status assignment_status NOT NULL DEFAULT 'planned',
    confidence_level confidence_level NOT NULL DEFAULT 'confirmed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    
    -- Constraints
    CONSTRAINT chk_assignment_dates CHECK (end_date IS NULL OR start_date <= end_date),
    CONSTRAINT chk_assignment_rate CHECK (hourly_rate IS NULL OR hourly_rate >= 0),
    CONSTRAINT unique_employee_project_date UNIQUE(project_id, employee_id, start_date)
);

-- Supporting enums
CREATE TYPE assignment_type AS ENUM ('employee', 'contractor', 'consultant', 'intern');
CREATE TYPE assignment_status AS ENUM ('planned', 'active', 'completed', 'cancelled', 'paused');
CREATE TYPE confidence_level AS ENUM ('tentative', 'probable', 'confirmed');
```

### 4. Time Entries (Actuals Tracking)
Records actual time spent for planned vs actual reporting.

```sql
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_assignment_id UUID NOT NULL REFERENCES resource_assignments(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    hours_worked DECIMAL(4,2) NOT NULL CHECK (hours_worked >= 0 AND hours_worked <= 24),
    description TEXT,
    billable BOOLEAN DEFAULT TRUE,
    approved BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_work_date_reasonable CHECK (
        work_date >= '2020-01-01' AND work_date <= CURRENT_DATE + INTERVAL '7 days'
    ),
    CONSTRAINT unique_assignment_date UNIQUE(resource_assignment_id, work_date)
);
```

### 5. Resource Conflicts
Tracks and manages resource over-allocation and conflicts.

```sql
CREATE TABLE resource_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    conflict_date DATE NOT NULL,
    total_allocation_percentage DECIMAL(5,2) NOT NULL,
    conflicting_assignments UUID[] NOT NULL, -- Array of resource_assignment IDs
    status conflict_status NOT NULL DEFAULT 'detected',
    resolution_notes TEXT,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES employees(id),
    
    -- Constraints
    CONSTRAINT chk_over_allocation CHECK (total_allocation_percentage > 100),
    CONSTRAINT unique_employee_conflict_date UNIQUE(employee_id, conflict_date)
);

CREATE TYPE conflict_status AS ENUM ('detected', 'acknowledged', 'resolved', 'ignored');
```

## Extended Indexes for Performance

```sql
-- Project-related indexes
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_dates ON projects(start_date, end_date);
CREATE INDEX idx_projects_code ON projects(code);
CREATE INDEX idx_projects_client ON projects(client_name);

-- Full-text search for projects
CREATE INDEX idx_projects_search ON projects USING gin(
    to_tsvector('english', name || ' ' || coalesce(description, '') || ' ' || code)
);

-- Project roles indexes
CREATE INDEX idx_project_roles_project ON project_roles(project_id);
CREATE INDEX idx_project_roles_skills ON project_roles USING gin(required_skills);
CREATE INDEX idx_project_roles_dates ON project_roles(start_date, end_date);
CREATE INDEX idx_project_roles_experience ON project_roles(minimum_experience_level);

-- Resource assignments indexes
CREATE INDEX idx_assignments_project ON resource_assignments(project_id);
CREATE INDEX idx_assignments_employee ON resource_assignments(employee_id);
CREATE INDEX idx_assignments_dates ON resource_assignments(start_date, end_date);
CREATE INDEX idx_assignments_status ON resource_assignments(status);
CREATE INDEX idx_assignments_active ON resource_assignments(employee_id, start_date, end_date) 
    WHERE status IN ('planned', 'active');

-- Time entries indexes
CREATE INDEX idx_time_entries_assignment ON time_entries(resource_assignment_id);
CREATE INDEX idx_time_entries_employee ON time_entries(employee_id);
CREATE INDEX idx_time_entries_project ON time_entries(project_id);
CREATE INDEX idx_time_entries_date ON time_entries(work_date DESC);
CREATE INDEX idx_time_entries_billable ON time_entries(billable, work_date);

-- Resource conflicts indexes
CREATE INDEX idx_conflicts_employee ON resource_conflicts(employee_id);
CREATE INDEX idx_conflicts_date ON resource_conflicts(conflict_date);
CREATE INDEX idx_conflicts_status ON resource_conflicts(status);
CREATE INDEX idx_conflicts_unresolved ON resource_conflicts(employee_id, conflict_date) 
    WHERE status IN ('detected', 'acknowledged');
```

## Advanced Views for Common Queries

### Employee Utilization View
```sql
CREATE VIEW employee_current_utilization AS
SELECT 
    e.id as employee_id,
    e.first_name,
    e.last_name,
    e.weekly_hours,
    COALESCE(SUM(ra.planned_allocation_percentage), 0) as total_planned_allocation,
    COALESCE(SUM(ra.planned_hours_per_week), 0) as total_planned_hours,
    COUNT(ra.id) as active_projects,
    CASE 
        WHEN COALESCE(SUM(ra.planned_allocation_percentage), 0) > 100 
        THEN 'over-allocated'
        WHEN COALESCE(SUM(ra.planned_allocation_percentage), 0) = 100 
        THEN 'fully-allocated'
        WHEN COALESCE(SUM(ra.planned_allocation_percentage), 0) > 80 
        THEN 'highly-utilized'
        ELSE 'available'
    END as utilization_status
FROM employees e
LEFT JOIN resource_assignments ra ON e.id = ra.employee_id 
    AND ra.status IN ('planned', 'active')
    AND CURRENT_DATE BETWEEN ra.start_date AND COALESCE(ra.end_date, CURRENT_DATE + INTERVAL '1 year')
WHERE e.status = 'active'
GROUP BY e.id, e.first_name, e.last_name, e.weekly_hours;
```

### Project Resource Summary View
```sql
CREATE VIEW project_resource_summary AS
SELECT 
    p.id as project_id,
    p.code,
    p.name,
    p.status,
    COUNT(DISTINCT pr.id) as total_roles,
    COUNT(DISTINCT CASE WHEN pr.is_filled THEN pr.id END) as filled_roles,
    COUNT(DISTINCT ra.employee_id) as assigned_employees,
    SUM(pr.estimated_hours) as total_estimated_hours,
    SUM(COALESCE(te.total_actual_hours, 0)) as total_actual_hours,
    CASE 
        WHEN COUNT(DISTINCT pr.id) = 0 THEN 0
        ELSE ROUND(
            (COUNT(DISTINCT CASE WHEN pr.is_filled THEN pr.id END) * 100.0) / 
            COUNT(DISTINCT pr.id), 2
        )
    END as role_fill_percentage
FROM projects p
LEFT JOIN project_roles pr ON p.id = pr.project_id
LEFT JOIN resource_assignments ra ON p.id = ra.project_id AND ra.status IN ('planned', 'active')
LEFT JOIN (
    SELECT project_id, SUM(hours_worked) as total_actual_hours
    FROM time_entries
    GROUP BY project_id
) te ON p.id = te.project_id
GROUP BY p.id, p.code, p.name, p.status;
```

## Triggers for Business Logic

### Automatic Conflict Detection
```sql
CREATE OR REPLACE FUNCTION detect_resource_conflicts()
RETURNS TRIGGER AS $$
DECLARE
    total_allocation DECIMAL(5,2);
    conflicting_assignment_ids UUID[];
BEGIN
    -- Calculate total allocation for employee on overlapping dates
    SELECT 
        SUM(planned_allocation_percentage),
        ARRAY_AGG(id)
    INTO total_allocation, conflicting_assignment_ids
    FROM resource_assignments
    WHERE employee_id = NEW.employee_id
        AND status IN ('planned', 'active')
        AND start_date <= COALESCE(NEW.end_date, '2099-12-31')
        AND COALESCE(end_date, '2099-12-31') >= NEW.start_date;
    
    -- If over-allocated, create conflict record
    IF total_allocation > 100 THEN
        INSERT INTO resource_conflicts (
            employee_id, 
            conflict_date, 
            total_allocation_percentage, 
            conflicting_assignments,
            status
        ) VALUES (
            NEW.employee_id,
            NEW.start_date,
            total_allocation,
            conflicting_assignment_ids,
            'detected'
        ) ON CONFLICT (employee_id, conflict_date) DO UPDATE SET
            total_allocation_percentage = EXCLUDED.total_allocation_percentage,
            conflicting_assignments = EXCLUDED.conflicting_assignments,
            detected_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER detect_conflicts_on_assignment 
    AFTER INSERT OR UPDATE ON resource_assignments
    FOR EACH ROW EXECUTE FUNCTION detect_resource_conflicts();
```

### Update Project Actuals
```sql
CREATE OR REPLACE FUNCTION update_project_actuals()
RETURNS TRIGGER AS $$
BEGIN
    -- Update project's actual hours
    UPDATE projects 
    SET actual_hours = (
        SELECT COALESCE(SUM(hours_worked), 0)
        FROM time_entries 
        WHERE project_id = NEW.project_id
    )
    WHERE id = NEW.project_id;
    
    -- Update resource assignment's actual allocation
    UPDATE resource_assignments
    SET actual_allocation_percentage = (
        SELECT 
            CASE 
                WHEN COUNT(*) = 0 THEN NULL
                ELSE ROUND((SUM(hours_worked) / (COUNT(DISTINCT work_date) * 8.0)) * 100, 2)
            END
        FROM time_entries te
        WHERE te.resource_assignment_id = NEW.resource_assignment_id
    )
    WHERE id = NEW.resource_assignment_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_actuals_on_time_entry 
    AFTER INSERT OR UPDATE OR DELETE ON time_entries
    FOR EACH ROW EXECUTE FUNCTION update_project_actuals();
```

## Migration Strategy

### Phase 1: Core Tables (2025-09-06)
1. Create new enums
2. Create projects table
3. Create project_roles table
4. Create resource_assignments table
5. Create basic indexes

### Phase 2: Advanced Features (2025-09-20)
1. Create time_entries table
2. Create resource_conflicts table  
3. Create performance views
4. Create business logic triggers

### Phase 3: Optimization (2025-10-04)
1. Add advanced indexes
2. Optimize query performance
3. Add materialized views for reporting
4. Implement archival strategy for completed projects

## Data Validation Queries

```sql
-- Check for resource over-allocation
SELECT 
    e.first_name || ' ' || e.last_name as employee_name,
    SUM(ra.planned_allocation_percentage) as total_allocation,
    COUNT(ra.id) as project_count
FROM employees e
JOIN resource_assignments ra ON e.id = ra.employee_id
WHERE ra.status IN ('planned', 'active')
    AND CURRENT_DATE BETWEEN ra.start_date AND COALESCE(ra.end_date, CURRENT_DATE + INTERVAL '1 year')
GROUP BY e.id, e.first_name, e.last_name
HAVING SUM(ra.planned_allocation_percentage) > 100;

-- Verify project role skills references
SELECT 
    pr.id,
    pr.role_name,
    pr.required_skills,
    array_length(pr.required_skills, 1) as skill_count,
    (
        SELECT COUNT(*)
        FROM unnest(pr.required_skills) skill_id
        WHERE EXISTS (SELECT 1 FROM skills s WHERE s.id = skill_id)
    ) as valid_skills_count
FROM project_roles pr
WHERE array_length(pr.required_skills, 1) > 0;

-- Check assignment date consistency
SELECT 
    ra.id,
    p.name as project_name,
    e.first_name || ' ' || e.last_name as employee_name,
    ra.start_date,
    ra.end_date,
    p.start_date as project_start,
    p.end_date as project_end
FROM resource_assignments ra
JOIN projects p ON ra.project_id = p.id
JOIN employees e ON ra.employee_id = e.id
WHERE ra.start_date < p.start_date 
    OR (p.end_date IS NOT NULL AND ra.end_date > p.end_date);
```

This schema extension provides a robust foundation for project-centric resource management while maintaining compatibility with the existing employee management system.
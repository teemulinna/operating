-- Migration: Project-Resource Integration Extension
-- Created: 2025-09-06
-- Purpose: Extend existing projects table and add project-resource integration features
-- Dependencies: Existing projects, employees, skills tables

BEGIN;

-- 1. Create project-related enums
CREATE TYPE IF NOT EXISTS project_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE IF NOT EXISTS assignment_type AS ENUM ('employee', 'contractor', 'consultant', 'intern');
CREATE TYPE IF NOT EXISTS assignment_status AS ENUM ('planned', 'active', 'completed', 'cancelled', 'paused');
CREATE TYPE IF NOT EXISTS confidence_level AS ENUM ('tentative', 'probable', 'confirmed');
CREATE TYPE IF NOT EXISTS conflict_status AS ENUM ('detected', 'acknowledged', 'resolved', 'ignored');
CREATE TYPE IF NOT EXISTS conflict_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- 2. Extend existing projects table (since it already exists with different structure)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS priority project_priority DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS estimated_hours INTEGER,
ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_by INTEGER;

-- Add constraints to existing projects table
ALTER TABLE projects 
ADD CONSTRAINT IF NOT EXISTS chk_project_estimated_hours CHECK (estimated_hours IS NULL OR estimated_hours > 0),
ADD CONSTRAINT IF NOT EXISTS chk_project_actual_hours CHECK (actual_hours >= 0);

-- 3. Create project_roles table  
CREATE TABLE IF NOT EXISTS project_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    required_skills UUID[] DEFAULT '{}',
    minimum_experience_level experience_level,
    start_date DATE NOT NULL,
    end_date DATE,
    planned_allocation_percentage DECIMAL(5,2) NOT NULL 
        CHECK (planned_allocation_percentage > 0 AND planned_allocation_percentage <= 100),
    estimated_hours INTEGER,
    hourly_rate DECIMAL(8,2),
    max_assignments INTEGER DEFAULT 1,
    current_assignments INTEGER DEFAULT 0,
    is_filled BOOLEAN GENERATED ALWAYS AS (current_assignments >= max_assignments) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_role_dates CHECK (end_date IS NULL OR start_date <= end_date),
    CONSTRAINT chk_role_hours CHECK (estimated_hours IS NULL OR estimated_hours > 0),
    CONSTRAINT chk_role_rate CHECK (hourly_rate IS NULL OR hourly_rate >= 0),
    CONSTRAINT chk_role_assignments CHECK (max_assignments >= 1 AND max_assignments <= 10),
    CONSTRAINT chk_current_assignments CHECK (current_assignments >= 0 AND current_assignments <= max_assignments)
);

-- 4. Create resource_assignments table
CREATE TABLE IF NOT EXISTS resource_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
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
    ) STORED,
    hourly_rate DECIMAL(8,2),
    status assignment_status NOT NULL DEFAULT 'planned',
    confidence_level confidence_level NOT NULL DEFAULT 'confirmed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    
    -- Constraints
    CONSTRAINT chk_assignment_dates CHECK (end_date IS NULL OR start_date <= end_date),
    CONSTRAINT chk_assignment_rate CHECK (hourly_rate IS NULL OR hourly_rate >= 0)
);

-- 5. Create resource_conflicts table
CREATE TABLE IF NOT EXISTS resource_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    conflict_date DATE NOT NULL,
    total_allocation_percentage DECIMAL(5,2) NOT NULL,
    conflicting_assignments UUID[] NOT NULL,
    status conflict_status NOT NULL DEFAULT 'detected',
    severity conflict_severity NOT NULL DEFAULT 'medium',
    resolution_notes TEXT,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES employees(id),
    
    CONSTRAINT chk_over_allocation CHECK (total_allocation_percentage > 100),
    CONSTRAINT unique_employee_conflict_date UNIQUE(employee_id, conflict_date)
);

-- 6. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_project_roles_project ON project_roles(project_id);
CREATE INDEX IF NOT EXISTS idx_project_roles_skills ON project_roles USING gin(required_skills);
CREATE INDEX IF NOT EXISTS idx_project_roles_dates ON project_roles(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_assignments_project ON resource_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_assignments_employee ON resource_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_assignments_dates ON resource_assignments(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON resource_assignments(status);

CREATE INDEX IF NOT EXISTS idx_conflicts_employee ON resource_conflicts(employee_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_status ON resource_conflicts(status);

-- 7. Create essential views for resource management
CREATE OR REPLACE VIEW employee_capacity_summary AS
SELECT 
    e.id as employee_id,
    e.first_name || ' ' || e.last_name as employee_name,
    COALESCE(e.weekly_hours, 40) as base_capacity,
    COALESCE(active_assignments.total_planned_allocation, 0) as current_allocation_percentage,
    COALESCE(active_assignments.total_planned_hours, 0) as current_allocated_hours,
    COALESCE(active_assignments.project_count, 0) as active_project_count,
    CASE 
        WHEN COALESCE(active_assignments.total_planned_allocation, 0) > 100 THEN 'over-allocated'
        WHEN COALESCE(active_assignments.total_planned_allocation, 0) = 100 THEN 'fully-allocated'
        WHEN COALESCE(active_assignments.total_planned_allocation, 0) > 80 THEN 'highly-utilized'
        ELSE 'available'
    END as capacity_status,
    COALESCE(e.weekly_hours, 40) - COALESCE(active_assignments.total_planned_hours, 0) as available_hours
FROM employees e
LEFT JOIN (
    SELECT 
        employee_id,
        SUM(planned_allocation_percentage) as total_planned_allocation,
        SUM(planned_hours_per_week) as total_planned_hours,
        COUNT(DISTINCT project_id) as project_count
    FROM resource_assignments
    WHERE status IN ('planned', 'active')
        AND CURRENT_DATE BETWEEN start_date AND COALESCE(end_date, CURRENT_DATE + INTERVAL '1 year')
    GROUP BY employee_id
) active_assignments ON e.id = active_assignments.employee_id
WHERE e.status = 'active';

-- 8. Create project summary view
CREATE OR REPLACE VIEW project_resource_summary AS
SELECT 
    p.id as project_id,
    p.name,
    p.status,
    p.start_date,
    p.end_date,
    COUNT(DISTINCT pr.id) as total_roles,
    COUNT(DISTINCT CASE WHEN pr.is_filled THEN pr.id END) as filled_roles,
    COUNT(DISTINCT ra.employee_id) as assigned_employees,
    COALESCE(SUM(pr.estimated_hours), 0) as total_estimated_hours,
    p.actual_hours as total_actual_hours,
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
GROUP BY p.id, p.name, p.status, p.start_date, p.end_date, p.actual_hours;

-- Add comments
COMMENT ON TABLE project_roles IS 'Defines required roles for each project with skills requirements';
COMMENT ON TABLE resource_assignments IS 'Links employees to projects with time allocation and capacity tracking';
COMMENT ON TABLE resource_conflicts IS 'Tracks and manages resource allocation conflicts';

COMMIT;
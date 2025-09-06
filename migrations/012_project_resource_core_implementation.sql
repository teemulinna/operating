-- Migration: Project Resource Core Implementation
-- Created: 2025-09-06
-- Purpose: Create core tables for project-resource integration
-- Version: PostgreSQL 14 compatible

-- 1. Create enums (check existence first)
DO $$ 
BEGIN
    -- Create assignment_type enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_type') THEN
        CREATE TYPE assignment_type AS ENUM ('employee', 'contractor', 'consultant', 'intern');
    END IF;
    
    -- Create assignment_status enum  
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_status') THEN
        CREATE TYPE assignment_status AS ENUM ('planned', 'active', 'completed', 'cancelled', 'paused');
    END IF;
    
    -- Create confidence_level enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'confidence_level') THEN
        CREATE TYPE confidence_level AS ENUM ('tentative', 'probable', 'confirmed');
    END IF;
    
    -- Create conflict_status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conflict_status') THEN
        CREATE TYPE conflict_status AS ENUM ('detected', 'acknowledged', 'resolved', 'ignored');
    END IF;
    
    -- Create conflict_severity enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conflict_severity') THEN
        CREATE TYPE conflict_severity AS ENUM ('low', 'medium', 'high', 'critical');
    END IF;
END $$;

-- 2. Extend existing projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS priority project_priority DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS estimated_hours INTEGER,
ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(8,2) DEFAULT 0;

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_role_dates CHECK (end_date IS NULL OR start_date <= end_date),
    CONSTRAINT chk_role_hours CHECK (estimated_hours IS NULL OR estimated_hours > 0),
    CONSTRAINT chk_role_rate CHECK (hourly_rate IS NULL OR hourly_rate >= 0),
    CONSTRAINT chk_role_assignments CHECK (max_assignments >= 1 AND max_assignments <= 10)
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
    hourly_rate DECIMAL(8,2),
    status assignment_status NOT NULL DEFAULT 'planned',
    confidence_level confidence_level NOT NULL DEFAULT 'confirmed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
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
CREATE INDEX IF NOT EXISTS idx_project_roles_dates ON project_roles(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_assignments_project ON resource_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_assignments_employee ON resource_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_assignments_dates ON resource_assignments(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON resource_assignments(status);
CREATE INDEX IF NOT EXISTS idx_conflicts_employee ON resource_conflicts(employee_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_status ON resource_conflicts(status);
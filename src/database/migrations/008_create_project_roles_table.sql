-- Migration: Create Project Roles Table
-- Created: 2025-09-06
-- Purpose: Define required roles for each project with skills requirements
-- Dependencies: 007_create_projects_table.sql, existing skills table

CREATE TABLE project_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
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
    
    -- Business rule constraints
    CONSTRAINT chk_role_dates CHECK (end_date IS NULL OR start_date <= end_date),
    CONSTRAINT chk_role_hours CHECK (estimated_hours IS NULL OR estimated_hours > 0),
    CONSTRAINT chk_role_rate CHECK (hourly_rate IS NULL OR hourly_rate >= 0),
    CONSTRAINT chk_role_assignments CHECK (max_assignments >= 1 AND max_assignments <= 10),
    CONSTRAINT chk_current_assignments CHECK (current_assignments >= 0 AND current_assignments <= max_assignments)
);

-- Performance indexes
CREATE INDEX idx_project_roles_project ON project_roles(project_id);
CREATE INDEX idx_project_roles_dates ON project_roles(start_date, end_date);
CREATE INDEX idx_project_roles_experience ON project_roles(minimum_experience_level);
CREATE INDEX idx_project_roles_filled ON project_roles(is_filled);

-- GIN index for skills array queries
CREATE INDEX idx_project_roles_skills ON project_roles USING gin(required_skills);

-- Composite index for active roles needing assignments
CREATE INDEX idx_project_roles_available ON project_roles(project_id, is_filled, start_date)
WHERE current_assignments < max_assignments;

-- Full-text search for role names and descriptions
CREATE INDEX idx_project_roles_search ON project_roles USING gin(
    to_tsvector('english', role_name || ' ' || coalesce(description, ''))
);

-- Function to validate skills exist in skills table
CREATE OR REPLACE FUNCTION validate_required_skills()
RETURNS TRIGGER AS $$
BEGIN
    -- Check that all required skills exist in the skills table
    IF NEW.required_skills IS NOT NULL AND array_length(NEW.required_skills, 1) > 0 THEN
        IF NOT EXISTS (
            SELECT 1 
            WHERE (
                SELECT COUNT(*)
                FROM unnest(NEW.required_skills) skill_id
                WHERE EXISTS (SELECT 1 FROM skills s WHERE s.id = skill_id AND s.is_active = true)
            ) = array_length(NEW.required_skills, 1)
        ) THEN
            RAISE EXCEPTION 'One or more required skills do not exist or are inactive';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to validate role dates against project dates
CREATE OR REPLACE FUNCTION validate_role_project_dates()
RETURNS TRIGGER AS $$
DECLARE
    project_start_date DATE;
    project_end_date DATE;
BEGIN
    -- Get project dates
    SELECT start_date, end_date INTO project_start_date, project_end_date
    FROM projects WHERE id = NEW.project_id;
    
    -- Validate role dates are within project bounds
    IF NEW.start_date < project_start_date THEN
        RAISE EXCEPTION 'Role start date cannot be before project start date';
    END IF;
    
    IF project_end_date IS NOT NULL AND NEW.end_date IS NOT NULL AND NEW.end_date > project_end_date THEN
        RAISE EXCEPTION 'Role end date cannot be after project end date';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for validation
CREATE TRIGGER validate_project_role_skills 
    BEFORE INSERT OR UPDATE ON project_roles
    FOR EACH ROW EXECUTE FUNCTION validate_required_skills();

CREATE TRIGGER validate_project_role_dates 
    BEFORE INSERT OR UPDATE ON project_roles
    FOR EACH ROW EXECUTE FUNCTION validate_role_project_dates();

-- Trigger for automatic updated_at timestamp
CREATE TRIGGER update_project_roles_updated_at 
    BEFORE UPDATE ON project_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE project_roles IS 'Defines required roles for each project with skills requirements';
COMMENT ON COLUMN project_roles.required_skills IS 'Array of skill UUIDs required for this role';
COMMENT ON COLUMN project_roles.planned_allocation_percentage IS 'Percentage of full-time allocation needed for this role';
COMMENT ON COLUMN project_roles.max_assignments IS 'Maximum number of people that can be assigned to this role';
COMMENT ON COLUMN project_roles.current_assignments IS 'Current number of people assigned to this role';
COMMENT ON COLUMN project_roles.is_filled IS 'Computed: true if current_assignments >= max_assignments';
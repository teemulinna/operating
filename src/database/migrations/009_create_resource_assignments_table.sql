-- Migration: Create Resource Assignments Table
-- Created: 2025-09-06
-- Purpose: Link employees to projects with capacity tracking
-- Dependencies: 008_create_project_roles_table.sql, existing employees table

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
    ) STORED,
    hourly_rate DECIMAL(8,2),
    status assignment_status NOT NULL DEFAULT 'planned',
    confidence_level confidence_level NOT NULL DEFAULT 'confirmed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    
    -- Business rule constraints
    CONSTRAINT chk_assignment_dates CHECK (end_date IS NULL OR start_date <= end_date),
    CONSTRAINT chk_assignment_rate CHECK (hourly_rate IS NULL OR hourly_rate >= 0),
    CONSTRAINT chk_assignment_start_date CHECK (start_date >= '2020-01-01' AND start_date <= CURRENT_DATE + INTERVAL '2 years'),
    CONSTRAINT unique_employee_project_overlap EXCLUDE USING gist (
        employee_id WITH =,
        daterange(start_date, COALESCE(end_date, '9999-12-31'), '[]') WITH &&
    ) WHERE (status IN ('planned', 'active'))
);

-- Performance indexes
CREATE INDEX idx_assignments_project ON resource_assignments(project_id);
CREATE INDEX idx_assignments_employee ON resource_assignments(employee_id);
CREATE INDEX idx_assignments_dates ON resource_assignments(start_date, end_date);
CREATE INDEX idx_assignments_status ON resource_assignments(status);
CREATE INDEX idx_assignments_role ON resource_assignments(project_role_id);

-- Composite indexes for complex queries
CREATE INDEX idx_assignments_active ON resource_assignments(employee_id, start_date, end_date) 
    WHERE status IN ('planned', 'active');

CREATE INDEX idx_assignments_project_active ON resource_assignments(project_id, status, start_date)
    WHERE status IN ('planned', 'active');

-- Function to validate assignment against project dates
CREATE OR REPLACE FUNCTION validate_assignment_project_dates()
RETURNS TRIGGER AS $$
DECLARE
    project_start_date DATE;
    project_end_date DATE;
BEGIN
    -- Get project dates
    SELECT start_date, end_date INTO project_start_date, project_end_date
    FROM projects WHERE id = NEW.project_id;
    
    -- Validate assignment dates are within project bounds
    IF NEW.start_date < project_start_date THEN
        RAISE EXCEPTION 'Assignment start date (%) cannot be before project start date (%)', 
            NEW.start_date, project_start_date;
    END IF;
    
    IF project_end_date IS NOT NULL AND NEW.end_date IS NOT NULL AND NEW.end_date > project_end_date THEN
        RAISE EXCEPTION 'Assignment end date (%) cannot be after project end date (%)', 
            NEW.end_date, project_end_date;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to check employee capacity across projects
CREATE OR REPLACE FUNCTION validate_employee_capacity()
RETURNS TRIGGER AS $$
DECLARE
    total_allocation DECIMAL(5,2);
    employee_weekly_hours DECIMAL(4,2);
BEGIN
    -- Get employee's weekly hour capacity
    SELECT weekly_hours INTO employee_weekly_hours
    FROM employees WHERE id = NEW.employee_id;
    
    -- Calculate total allocation across all overlapping assignments
    SELECT COALESCE(SUM(planned_allocation_percentage), 0) INTO total_allocation
    FROM resource_assignments
    WHERE employee_id = NEW.employee_id
        AND status IN ('planned', 'active')
        AND start_date <= COALESCE(NEW.end_date, '9999-12-31')
        AND COALESCE(end_date, '9999-12-31') >= NEW.start_date
        AND (TG_OP = 'INSERT' OR id != NEW.id); -- Exclude current record for updates
    
    -- Add current assignment allocation
    total_allocation := total_allocation + NEW.planned_allocation_percentage;
    
    -- Validate capacity (allow up to 105% with warning)
    IF total_allocation > 105 THEN
        RAISE EXCEPTION 'Employee allocation would exceed 105%% capacity (current: %%, adding: %%)', 
            total_allocation - NEW.planned_allocation_percentage, NEW.planned_allocation_percentage;
    END IF;
    
    -- Create warning for over 100% allocation
    IF total_allocation > 100 THEN
        -- Insert into resource conflicts table for monitoring
        INSERT INTO resource_conflicts (
            employee_id, 
            conflict_date, 
            total_allocation_percentage, 
            status
        ) VALUES (
            NEW.employee_id,
            NEW.start_date,
            total_allocation,
            'detected'
        ) ON CONFLICT (employee_id, conflict_date) DO UPDATE SET
            total_allocation_percentage = EXCLUDED.total_allocation_percentage,
            detected_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update project role assignment counts
CREATE OR REPLACE FUNCTION update_role_assignment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment role assignment count
        UPDATE project_roles 
        SET current_assignments = current_assignments + 1
        WHERE id = NEW.project_role_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement role assignment count
        UPDATE project_roles 
        SET current_assignments = GREATEST(current_assignments - 1, 0)
        WHERE id = OLD.project_role_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle role changes
        IF OLD.project_role_id IS DISTINCT FROM NEW.project_role_id THEN
            -- Decrement old role
            IF OLD.project_role_id IS NOT NULL THEN
                UPDATE project_roles 
                SET current_assignments = GREATEST(current_assignments - 1, 0)
                WHERE id = OLD.project_role_id;
            END IF;
            -- Increment new role
            IF NEW.project_role_id IS NOT NULL THEN
                UPDATE project_roles 
                SET current_assignments = current_assignments + 1
                WHERE id = NEW.project_role_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
END;
$$ language 'plpgsql';

-- Triggers for business logic validation
CREATE TRIGGER validate_assignment_project_dates 
    BEFORE INSERT OR UPDATE ON resource_assignments
    FOR EACH ROW EXECUTE FUNCTION validate_assignment_project_dates();

CREATE TRIGGER validate_assignment_capacity 
    BEFORE INSERT OR UPDATE ON resource_assignments
    FOR EACH ROW EXECUTE FUNCTION validate_employee_capacity();

CREATE TRIGGER update_assignment_role_count 
    AFTER INSERT OR UPDATE OR DELETE ON resource_assignments
    FOR EACH ROW EXECUTE FUNCTION update_role_assignment_count();

-- Trigger for automatic updated_at timestamp
CREATE TRIGGER update_assignments_updated_at 
    BEFORE UPDATE ON resource_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE resource_assignments IS 'Links employees to projects with allocation tracking and capacity management';
COMMENT ON COLUMN resource_assignments.planned_allocation_percentage IS 'Percentage of employee time allocated to this project';
COMMENT ON COLUMN resource_assignments.actual_allocation_percentage IS 'Actual percentage tracked (updated from time entries)';
COMMENT ON COLUMN resource_assignments.planned_hours_per_week IS 'Computed hours per week based on allocation percentage';
COMMENT ON COLUMN resource_assignments.confidence_level IS 'Planning confidence (tentative, probable, confirmed)';
COMMENT ON CONSTRAINT unique_employee_project_overlap IS 'Prevents overlapping assignments for same employee';
-- Migration: Create assignment_allocations table for multi-project assignment support
-- This table tracks individual project allocations within a multi-project assignment
-- Enables employees to be assigned to multiple projects with specific allocation percentages

CREATE TABLE IF NOT EXISTS assignment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL,
    project_id INTEGER NOT NULL,
    role_id UUID NOT NULL,
    allocation_percentage DECIMAL(5,2) NOT NULL CHECK (allocation_percentage > 0 AND allocation_percentage <= 100),
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'on_hold')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_assignment_allocations_assignment 
        FOREIGN KEY (assignment_id) REFERENCES resource_assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_assignment_allocations_project 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_assignment_allocations_role 
        FOREIGN KEY (role_id) REFERENCES project_roles(id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate allocations
    CONSTRAINT uq_assignment_project_role 
        UNIQUE (assignment_id, project_id, role_id),
    
    -- Check constraint for valid date range
    CONSTRAINT chk_assignment_allocation_dates 
        CHECK (end_date IS NULL OR start_date <= end_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignment_allocations_assignment 
    ON assignment_allocations(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_allocations_project 
    ON assignment_allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_assignment_allocations_role 
    ON assignment_allocations(role_id);
CREATE INDEX IF NOT EXISTS idx_assignment_allocations_dates 
    ON assignment_allocations(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_assignment_allocations_status 
    ON assignment_allocations(status);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_assignment_allocations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_assignment_allocations_updated_at ON assignment_allocations;
CREATE TRIGGER trigger_assignment_allocations_updated_at
    BEFORE UPDATE ON assignment_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_assignment_allocations_updated_at();

-- Add comments for documentation
COMMENT ON TABLE assignment_allocations IS 'Individual project allocations within multi-project assignments';
COMMENT ON COLUMN assignment_allocations.assignment_id IS 'Reference to the parent resource assignment';
COMMENT ON COLUMN assignment_allocations.project_id IS 'Project for this allocation';
COMMENT ON COLUMN assignment_allocations.role_id IS 'Role within the project';
COMMENT ON COLUMN assignment_allocations.allocation_percentage IS 'Percentage of employee time allocated to this project (0-100)';
COMMENT ON COLUMN assignment_allocations.start_date IS 'Start date for this project allocation';
COMMENT ON COLUMN assignment_allocations.end_date IS 'End date for this project allocation (NULL for ongoing)';
COMMENT ON COLUMN assignment_allocations.status IS 'Current status of the allocation';

-- Function to validate total allocation doesn't exceed 100% for an employee
CREATE OR REPLACE FUNCTION validate_employee_total_allocation()
RETURNS TRIGGER AS $$
DECLARE
    employee_id INTEGER;
    total_allocation DECIMAL(5,2);
    overlap_start DATE;
    overlap_end DATE;
BEGIN
    -- Get employee_id from the assignment
    SELECT ra.employee_id INTO employee_id
    FROM resource_assignments ra
    WHERE ra.id = NEW.assignment_id;
    
    -- Set overlap period for validation
    overlap_start := NEW.start_date;
    overlap_end := COALESCE(NEW.end_date, '2099-12-31'::DATE);
    
    -- Calculate total allocation for overlapping periods
    SELECT COALESCE(SUM(aa.allocation_percentage), 0) INTO total_allocation
    FROM assignment_allocations aa
    JOIN resource_assignments ra ON aa.assignment_id = ra.id
    WHERE ra.employee_id = employee_id
      AND aa.status = 'active'
      AND aa.id != COALESCE(NEW.id, -1) -- Exclude current record for updates
      AND aa.start_date <= overlap_end
      AND COALESCE(aa.end_date, '2099-12-31'::DATE) >= overlap_start;
    
    -- Add new allocation to total
    total_allocation := total_allocation + NEW.allocation_percentage;
    
    -- Check if total exceeds 100%
    IF total_allocation > 100 THEN
        RAISE EXCEPTION 'Total allocation percentage (%.2f%%) exceeds 100%% for employee % during period % to %', 
            total_allocation, employee_id, overlap_start, COALESCE(overlap_end, 'ongoing');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the validation trigger
DROP TRIGGER IF EXISTS trigger_validate_allocation ON assignment_allocations;
CREATE TRIGGER trigger_validate_allocation
    BEFORE INSERT OR UPDATE ON assignment_allocations
    FOR EACH ROW
    EXECUTE FUNCTION validate_employee_total_allocation();

-- Create a view for easy querying of multi-project assignments
CREATE OR REPLACE VIEW multi_project_assignments AS
SELECT 
    ra.id as assignment_id,
    ra.employee_id,
    e.first_name || ' ' || e.last_name as employee_name,
    e.email as employee_email,
    ra.start_date as assignment_start,
    ra.end_date as assignment_end,
    ra.status as assignment_status,
    COUNT(aa.id) as project_count,
    SUM(aa.allocation_percentage) as total_allocation,
    JSON_AGG(
        JSON_BUILD_OBJECT(
            'project_id', p.id,
            'project_name', p.name,
            'role_id', pr.id,
            'role_name', pr.role_name,
            'allocation_percentage', aa.allocation_percentage,
            'start_date', aa.start_date,
            'end_date', aa.end_date,
            'status', aa.status
        ) ORDER BY aa.allocation_percentage DESC
    ) as allocations
FROM resource_assignments ra
JOIN employees e ON ra.employee_id = e.id
LEFT JOIN assignment_allocations aa ON ra.id = aa.assignment_id
LEFT JOIN projects p ON aa.project_id = p.id
LEFT JOIN project_roles pr ON aa.role_id = pr.id
WHERE ra.status IN ('active', 'planned')
GROUP BY ra.id, ra.employee_id, e.first_name, e.last_name, e.email, 
         ra.start_date, ra.end_date, ra.status
HAVING COUNT(aa.id) > 0;

COMMENT ON VIEW multi_project_assignments IS 'View showing multi-project assignments with allocation details';

-- Grant permissions (commented out as app_user may not exist)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON assignment_allocations TO app_user;
-- GRANT SELECT ON multi_project_assignments TO app_user;
-- Migration: Create time_entries table for time tracking functionality
-- This table tracks actual time worked against project assignments
-- Enables planned vs actual hours analysis and billing calculations

CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    project_id INTEGER NOT NULL,
    date DATE NOT NULL,
    hours_worked DECIMAL(4,2) NOT NULL CHECK (hours_worked > 0 AND hours_worked <= 24),
    billable_hours DECIMAL(4,2) DEFAULT 0 CHECK (billable_hours >= 0),
    description TEXT,
    task_category VARCHAR(50) DEFAULT 'general' CHECK (
        task_category IN ('development', 'testing', 'review', 'meetings', 'documentation', 
                         'design', 'research', 'support', 'training', 'administration', 'general')
    ),
    hourly_rate DECIMAL(8,2),
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    approval_notes TEXT,
    rejected_by VARCHAR(255),
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_time_entries_assignment 
        FOREIGN KEY (assignment_id) REFERENCES resource_assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_time_entries_employee 
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    CONSTRAINT fk_time_entries_project 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate entries for same date/assignment
    CONSTRAINT uq_time_entry_assignment_date 
        UNIQUE (assignment_id, date),
    
    -- Check constraints
    CONSTRAINT chk_billable_hours_not_exceeds_worked 
        CHECK (billable_hours <= hours_worked),
    CONSTRAINT chk_future_date 
        CHECK (date <= CURRENT_DATE),
    CONSTRAINT chk_approval_fields
        CHECK (
            (is_approved = TRUE AND approved_by IS NOT NULL AND approved_at IS NOT NULL) OR
            (is_approved = FALSE)
        ),
    CONSTRAINT chk_rejection_fields
        CHECK (
            (rejected_by IS NOT NULL AND rejected_at IS NOT NULL AND rejection_reason IS NOT NULL) OR
            (rejected_by IS NULL AND rejected_at IS NULL AND rejection_reason IS NULL)
        )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_entries_assignment 
    ON time_entries(assignment_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee 
    ON time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project 
    ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date 
    ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_time_entries_approval 
    ON time_entries(is_approved);
CREATE INDEX IF NOT EXISTS idx_time_entries_category 
    ON time_entries(task_category);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_date 
    ON time_entries(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_time_entries_project_date 
    ON time_entries(project_id, date);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_time_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_time_entries_updated_at ON time_entries;
CREATE TRIGGER trigger_time_entries_updated_at
    BEFORE UPDATE ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_time_entries_updated_at();

-- Function to validate time entry against assignment dates
CREATE OR REPLACE FUNCTION validate_time_entry_dates()
RETURNS TRIGGER AS $$
DECLARE
    assignment_start DATE;
    assignment_end DATE;
    project_start DATE;
    project_end DATE;
BEGIN
    -- Get assignment and project date ranges
    SELECT ra.start_date, ra.end_date, p.start_date, p.end_date
    INTO assignment_start, assignment_end, project_start, project_end
    FROM resource_assignments ra
    JOIN projects p ON ra.project_id = p.id
    WHERE ra.id = NEW.assignment_id;
    
    -- Validate against assignment dates
    IF NEW.date < assignment_start THEN
        RAISE EXCEPTION 'Time entry date % is before assignment start date %', NEW.date, assignment_start;
    END IF;
    
    IF assignment_end IS NOT NULL AND NEW.date > assignment_end THEN
        RAISE EXCEPTION 'Time entry date % is after assignment end date %', NEW.date, assignment_end;
    END IF;
    
    -- Validate against project dates
    IF NEW.date < project_start THEN
        RAISE EXCEPTION 'Time entry date % is before project start date %', NEW.date, project_start;
    END IF;
    
    IF project_end IS NOT NULL AND NEW.date > project_end THEN
        RAISE EXCEPTION 'Time entry date % is after project end date %', NEW.date, project_end;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the validation trigger
DROP TRIGGER IF EXISTS trigger_validate_time_entry_dates ON time_entries;
CREATE TRIGGER trigger_validate_time_entry_dates
    BEFORE INSERT OR UPDATE ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION validate_time_entry_dates();

-- Create materialized view for time entry analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS time_entry_analytics AS
SELECT 
    te.employee_id,
    te.project_id,
    te.assignment_id,
    DATE_TRUNC('week', te.date) as week_start,
    DATE_TRUNC('month', te.date) as month_start,
    te.task_category,
    COUNT(*) as entry_count,
    SUM(te.hours_worked) as total_hours,
    SUM(te.billable_hours) as total_billable_hours,
    AVG(te.hours_worked) as avg_daily_hours,
    AVG(te.billable_hours) as avg_daily_billable,
    SUM(CASE WHEN te.is_approved THEN te.hours_worked ELSE 0 END) as approved_hours,
    SUM(CASE WHEN te.is_approved THEN te.billable_hours ELSE 0 END) as approved_billable_hours,
    SUM(te.billable_hours * COALESCE(te.hourly_rate, 0)) as total_revenue
FROM time_entries te
GROUP BY te.employee_id, te.project_id, te.assignment_id, 
         DATE_TRUNC('week', te.date), DATE_TRUNC('month', te.date), te.task_category;

-- Create unique index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_time_entry_analytics_unique
    ON time_entry_analytics(employee_id, project_id, assignment_id, week_start, month_start, task_category);

-- Create indexes on the materialized view
CREATE INDEX IF NOT EXISTS idx_time_entry_analytics_employee 
    ON time_entry_analytics(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entry_analytics_project 
    ON time_entry_analytics(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entry_analytics_week 
    ON time_entry_analytics(week_start);
CREATE INDEX IF NOT EXISTS idx_time_entry_analytics_month 
    ON time_entry_analytics(month_start);

-- Create view for time variance analysis
CREATE OR REPLACE VIEW time_variance_analysis AS
SELECT 
    ra.id as assignment_id,
    ra.employee_id,
    ra.project_id,
    e.first_name || ' ' || e.last_name as employee_name,
    p.name as project_name,
    pr.role_name,
    ra.planned_hours_per_week,
    ra.start_date as assignment_start,
    ra.end_date as assignment_end,
    
    -- Calculate planned hours for the period
    CASE 
        WHEN ra.end_date IS NOT NULL THEN 
            ra.planned_hours_per_week * 
            (EXTRACT(EPOCH FROM (ra.end_date - ra.start_date)) / 604800) -- seconds to weeks
        ELSE ra.planned_hours_per_week * 
            (EXTRACT(EPOCH FROM (CURRENT_DATE - ra.start_date)) / 604800)
    END as total_planned_hours,
    
    -- Actual hours from time entries
    COALESCE(time_summary.total_actual_hours, 0) as total_actual_hours,
    COALESCE(time_summary.total_billable_hours, 0) as total_billable_hours,
    COALESCE(time_summary.entry_count, 0) as entry_count,
    COALESCE(time_summary.avg_daily_hours, 0) as avg_daily_hours,
    
    -- Calculate variance
    COALESCE(time_summary.total_actual_hours, 0) - 
    CASE 
        WHEN ra.end_date IS NOT NULL THEN 
            ra.planned_hours_per_week * 
            (EXTRACT(EPOCH FROM (ra.end_date - ra.start_date)) / 604800)
        ELSE ra.planned_hours_per_week * 
            (EXTRACT(EPOCH FROM (CURRENT_DATE - ra.start_date)) / 604800)
    END as hours_variance,
    
    -- Calculate variance percentage
    CASE 
        WHEN ra.planned_hours_per_week > 0 THEN
            ROUND(
                ((COALESCE(time_summary.total_actual_hours, 0) - 
                  CASE 
                      WHEN ra.end_date IS NOT NULL THEN 
                          ra.planned_hours_per_week * 
                          (EXTRACT(EPOCH FROM (ra.end_date - ra.start_date)) / 604800)
                      ELSE ra.planned_hours_per_week * 
                          (EXTRACT(EPOCH FROM (CURRENT_DATE - ra.start_date)) / 604800)
                  END) / 
                  (ra.planned_hours_per_week * 
                   CASE 
                       WHEN ra.end_date IS NOT NULL THEN 
                           (EXTRACT(EPOCH FROM (ra.end_date - ra.start_date)) / 604800)
                       ELSE (EXTRACT(EPOCH FROM (CURRENT_DATE - ra.start_date)) / 604800)
                   END) * 100), 2)
        ELSE 0
    END as variance_percentage,
    
    -- Utilization rate
    CASE 
        WHEN ra.planned_hours_per_week > 0 AND 
             EXTRACT(EPOCH FROM (COALESCE(ra.end_date, CURRENT_DATE) - ra.start_date)) / 604800 > 0 THEN
            ROUND((COALESCE(time_summary.total_actual_hours, 0) / 
                  (ra.planned_hours_per_week * 
                   (EXTRACT(EPOCH FROM (COALESCE(ra.end_date, CURRENT_DATE) - ra.start_date)) / 604800))) * 100, 2)
        ELSE 0
    END as utilization_rate,
    
    -- Billability rate
    CASE 
        WHEN COALESCE(time_summary.total_actual_hours, 0) > 0 THEN
            ROUND((COALESCE(time_summary.total_billable_hours, 0) / 
                  COALESCE(time_summary.total_actual_hours, 1)) * 100, 2)
        ELSE 0
    END as billability_rate

FROM resource_assignments ra
JOIN employees e ON ra.employee_id = e.id
JOIN projects p ON ra.project_id = p.id
JOIN project_roles pr ON ra.role_id = pr.id
LEFT JOIN (
    SELECT 
        assignment_id,
        SUM(hours_worked) as total_actual_hours,
        SUM(billable_hours) as total_billable_hours,
        COUNT(*) as entry_count,
        AVG(hours_worked) as avg_daily_hours
    FROM time_entries
    WHERE is_approved = TRUE
    GROUP BY assignment_id
) time_summary ON ra.id = time_summary.assignment_id
WHERE ra.status IN ('active', 'completed');

-- Add comments for documentation
COMMENT ON TABLE time_entries IS 'Time tracking entries for resource assignments';
COMMENT ON COLUMN time_entries.assignment_id IS 'Reference to the resource assignment';
COMMENT ON COLUMN time_entries.employee_id IS 'Employee who worked the time';
COMMENT ON COLUMN time_entries.project_id IS 'Project the time was worked on';
COMMENT ON COLUMN time_entries.date IS 'Date the work was performed';
COMMENT ON COLUMN time_entries.hours_worked IS 'Total hours worked (max 24 per day)';
COMMENT ON COLUMN time_entries.billable_hours IS 'Hours that can be billed to client';
COMMENT ON COLUMN time_entries.task_category IS 'Category of work performed';
COMMENT ON COLUMN time_entries.hourly_rate IS 'Hourly rate for billing calculation';
COMMENT ON COLUMN time_entries.is_approved IS 'Whether the entry has been approved';

COMMENT ON MATERIALIZED VIEW time_entry_analytics IS 'Aggregated time entry data for analytics';
COMMENT ON VIEW time_variance_analysis IS 'Analysis of planned vs actual hours with variance calculations';

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_time_entry_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW time_entry_analytics;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (commented out as app_user may not exist)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON time_entries TO app_user;
-- GRANT SELECT ON time_entry_analytics TO app_user;
-- GRANT SELECT ON time_variance_analysis TO app_user;
-- GRANT EXECUTE ON FUNCTION refresh_time_entry_analytics() TO app_user;
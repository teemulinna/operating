-- Migration: Create Resource Conflicts Table
-- Created: 2025-09-06
-- Purpose: Track and manage resource allocation conflicts
-- Dependencies: 009_create_resource_assignments_table.sql

CREATE TABLE resource_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    conflict_date DATE NOT NULL,
    total_allocation_percentage DECIMAL(5,2) NOT NULL,
    conflicting_assignments UUID[] NOT NULL,
    status conflict_status NOT NULL DEFAULT 'detected',
    resolution_notes TEXT,
    severity conflict_severity NOT NULL DEFAULT 'medium',
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES employees(id),
    
    -- Business rule constraints
    CONSTRAINT chk_over_allocation CHECK (total_allocation_percentage > 100),
    CONSTRAINT chk_conflict_date_reasonable CHECK (
        conflict_date >= CURRENT_DATE - INTERVAL '1 year' AND 
        conflict_date <= CURRENT_DATE + INTERVAL '2 years'
    ),
    CONSTRAINT unique_employee_conflict_date UNIQUE(employee_id, conflict_date)
);

-- Create conflict severity enum
CREATE TYPE conflict_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Performance indexes
CREATE INDEX idx_conflicts_employee ON resource_conflicts(employee_id);
CREATE INDEX idx_conflicts_date ON resource_conflicts(conflict_date);
CREATE INDEX idx_conflicts_status ON resource_conflicts(status);
CREATE INDEX idx_conflicts_severity ON resource_conflicts(severity);

-- Composite index for unresolved conflicts
CREATE INDEX idx_conflicts_unresolved ON resource_conflicts(employee_id, conflict_date, severity) 
    WHERE status IN ('detected', 'acknowledged');

-- Function to automatically resolve conflicts when assignments change
CREATE OR REPLACE FUNCTION auto_resolve_conflicts()
RETURNS TRIGGER AS $$
DECLARE
    current_total_allocation DECIMAL(5,2);
BEGIN
    -- Recalculate total allocation for the employee
    SELECT COALESCE(SUM(planned_allocation_percentage), 0) INTO current_total_allocation
    FROM resource_assignments
    WHERE employee_id = COALESCE(NEW.employee_id, OLD.employee_id)
        AND status IN ('planned', 'active')
        AND start_date <= COALESCE(
            CASE WHEN TG_OP = 'DELETE' THEN OLD.end_date ELSE NEW.end_date END, 
            '9999-12-31'
        )
        AND COALESCE(end_date, '9999-12-31') >= COALESCE(
            CASE WHEN TG_OP = 'DELETE' THEN OLD.start_date ELSE NEW.start_date END,
            CURRENT_DATE
        );
    
    -- If allocation is now ≤100%, resolve conflicts
    IF current_total_allocation <= 100 THEN
        UPDATE resource_conflicts
        SET status = 'resolved',
            resolved_at = CURRENT_TIMESTAMP,
            resolution_notes = 'Auto-resolved: allocation reduced to ' || current_total_allocation || '%'
        WHERE employee_id = COALESCE(NEW.employee_id, OLD.employee_id)
            AND status IN ('detected', 'acknowledged');
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Function to determine conflict severity
CREATE OR REPLACE FUNCTION calculate_conflict_severity(allocation_percentage DECIMAL)
RETURNS conflict_severity AS $$
BEGIN
    CASE 
        WHEN allocation_percentage > 150 THEN RETURN 'critical';
        WHEN allocation_percentage > 125 THEN RETURN 'high';
        WHEN allocation_percentage > 110 THEN RETURN 'medium';
        ELSE RETURN 'low';
    END CASE;
END;
$$ language 'plpgsql';

-- Trigger to auto-resolve conflicts when assignments change
CREATE TRIGGER auto_resolve_assignment_conflicts 
    AFTER INSERT OR UPDATE OR DELETE ON resource_assignments
    FOR EACH ROW EXECUTE FUNCTION auto_resolve_conflicts();

-- View for current conflicts summary
CREATE VIEW current_conflicts AS
SELECT 
    c.id,
    c.employee_id,
    e.first_name || ' ' || e.last_name as employee_name,
    e.email as employee_email,
    c.conflict_date,
    c.total_allocation_percentage,
    c.severity,
    c.status,
    array_length(c.conflicting_assignments, 1) as num_conflicting_projects,
    c.detected_at,
    EXTRACT(days FROM CURRENT_TIMESTAMP - c.detected_at) as days_unresolved
FROM resource_conflicts c
JOIN employees e ON c.employee_id = e.id
WHERE c.status IN ('detected', 'acknowledged')
ORDER BY c.severity DESC, c.detected_at ASC;

-- View for employee capacity summary
CREATE VIEW employee_capacity_summary AS
SELECT 
    e.id as employee_id,
    e.first_name || ' ' || e.last_name as employee_name,
    e.weekly_hours as base_capacity,
    COALESCE(active_assignments.total_planned_allocation, 0) as current_allocation_percentage,
    COALESCE(active_assignments.total_planned_hours, 0) as current_allocated_hours,
    COALESCE(active_assignments.project_count, 0) as active_project_count,
    CASE 
        WHEN COALESCE(active_assignments.total_planned_allocation, 0) > 100 THEN 'over-allocated'
        WHEN COALESCE(active_assignments.total_planned_allocation, 0) = 100 THEN 'fully-allocated'
        WHEN COALESCE(active_assignments.total_planned_allocation, 0) > 80 THEN 'highly-utilized'
        ELSE 'available'
    END as capacity_status,
    e.weekly_hours - COALESCE(active_assignments.total_planned_hours, 0) as available_hours
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

-- Comments for documentation
COMMENT ON TABLE resource_assignments IS 'Links employees to projects with time allocation and capacity tracking';
COMMENT ON COLUMN resource_assignments.planned_allocation_percentage IS 'Percentage of employee time planned for this project';
COMMENT ON COLUMN resource_assignments.actual_allocation_percentage IS 'Actual percentage tracked from time entries';
COMMENT ON COLUMN resource_assignments.planned_hours_per_week IS 'Computed weekly hours based on allocation percentage';
COMMENT ON COLUMN resource_assignments.confidence_level IS 'Planning confidence level for the assignment';

COMMENT ON VIEW current_conflicts IS 'Active resource conflicts requiring management attention';
COMMENT ON VIEW employee_capacity_summary IS 'Current capacity utilization summary for all active employees';
-- Migration: Create Heat Map Views and Supporting Structures
-- Phase 1: Visual Capacity Heat Maps
-- Performance Target: <500ms response for 1 year view with 100 employees

-- Drop existing views if they exist
DROP MATERIALIZED VIEW IF EXISTS daily_capacity_heatmap CASCADE;
DROP VIEW IF EXISTS weekly_capacity_summary CASCADE;
DROP VIEW IF EXISTS monthly_capacity_summary CASCADE;
DROP INDEX IF EXISTS idx_heatmap_date;
DROP INDEX IF EXISTS idx_heatmap_employee;
DROP INDEX IF EXISTS idx_heatmap_department;
DROP INDEX IF EXISTS idx_heatmap_lookup;

-- Create function to calculate daily capacity
CREATE OR REPLACE FUNCTION calculate_daily_capacity(
    p_employee_id UUID,
    p_date DATE
) RETURNS TABLE (
    available_hours DECIMAL(4,2),
    allocated_hours DECIMAL(4,2),
    utilization_percentage DECIMAL(5,2)
) AS $$
DECLARE
    v_available_hours DECIMAL(4,2) := 8.0; -- Default 8 hours
    v_allocated_hours DECIMAL(4,2) := 0;
BEGIN
    -- Get available hours from availability patterns
    SELECT COALESCE(
        CASE
            WHEN ap.pattern_type = 'weekly' THEN
                CASE EXTRACT(DOW FROM p_date)
                    WHEN 0 THEN (ap.weekly_hours->>'sunday')::DECIMAL(4,2)
                    WHEN 1 THEN (ap.weekly_hours->>'monday')::DECIMAL(4,2)
                    WHEN 2 THEN (ap.weekly_hours->>'tuesday')::DECIMAL(4,2)
                    WHEN 3 THEN (ap.weekly_hours->>'wednesday')::DECIMAL(4,2)
                    WHEN 4 THEN (ap.weekly_hours->>'thursday')::DECIMAL(4,2)
                    WHEN 5 THEN (ap.weekly_hours->>'friday')::DECIMAL(4,2)
                    WHEN 6 THEN (ap.weekly_hours->>'saturday')::DECIMAL(4,2)
                END
            WHEN ap.pattern_type = 'custom' AND ap.metadata IS NOT NULL THEN
                COALESCE((ap.metadata->>'dailyHours')::DECIMAL(4,2), 8.0)
            ELSE 8.0
        END, 8.0
    ) INTO v_available_hours
    FROM availability_patterns ap
    WHERE ap.employee_id = p_employee_id
      AND ap.is_active = true
      AND p_date BETWEEN ap.start_date AND COALESCE(ap.end_date, '9999-12-31'::date)
    ORDER BY ap.created_at DESC
    LIMIT 1;

    -- Check for availability exceptions (PTO, holidays, etc)
    SELECT COALESCE(
        CASE
            WHEN ae.exception_type IN ('holiday', 'leave', 'training') THEN 0
            WHEN ae.exception_type = 'other' AND ae.hours_affected IS NOT NULL THEN
                ae.hours_affected
            ELSE v_available_hours
        END, v_available_hours
    ) INTO v_available_hours
    FROM availability_exceptions ae
    WHERE ae.employee_id = p_employee_id
      AND p_date BETWEEN ae.exception_date AND COALESCE(ae.end_date, ae.exception_date)
    LIMIT 1;

    -- Calculate allocated hours from resource allocations
    SELECT COALESCE(SUM(ra.allocated_hours), 0) INTO v_allocated_hours
    FROM resource_allocations ra
    WHERE ra.employee_id = p_employee_id
      AND p_date BETWEEN ra.start_date AND ra.end_date
      AND ra.is_active = true;

    RETURN QUERY SELECT
        v_available_hours,
        v_allocated_hours,
        CASE
            WHEN v_available_hours > 0 THEN
                ROUND((v_allocated_hours / v_available_hours * 100)::DECIMAL(5,2), 2)
            ELSE 0
        END AS utilization_percentage;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create the main materialized view for heat map data
CREATE MATERIALIZED VIEW daily_capacity_heatmap AS
WITH date_range AS (
    SELECT generate_series(
        CURRENT_DATE - INTERVAL '3 months',
        CURRENT_DATE + INTERVAL '6 months',
        '1 day'::INTERVAL
    )::DATE as date
),
employee_dates AS (
    SELECT
        e.id as employee_id,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name,
        e.department_id,
        d.name as department_name,
        dr.date
    FROM employees e
    CROSS JOIN date_range dr
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE e.is_active = true
),
daily_capacity AS (
    SELECT
        ed.employee_id,
        ed.employee_name,
        ed.department_id,
        ed.department_name,
        ed.date,
        (calculate_daily_capacity(ed.employee_id, ed.date)).*
    FROM employee_dates ed
)
SELECT
    dc.employee_id,
    dc.employee_name,
    dc.department_id,
    dc.department_name,
    dc.date,
    EXTRACT(YEAR FROM dc.date) as year,
    EXTRACT(MONTH FROM dc.date) as month,
    EXTRACT(WEEK FROM dc.date) as week,
    EXTRACT(DOW FROM dc.date) as day_of_week,
    dc.available_hours,
    dc.allocated_hours,
    dc.utilization_percentage,
    CASE
        WHEN dc.utilization_percentage >= 120 THEN 'critical'
        WHEN dc.utilization_percentage >= 100 THEN 'over'
        WHEN dc.utilization_percentage >= 80 THEN 'high'
        WHEN dc.utilization_percentage >= 60 THEN 'optimal'
        WHEN dc.utilization_percentage >= 40 THEN 'moderate'
        WHEN dc.utilization_percentage > 0 THEN 'low'
        ELSE 'available'
    END as utilization_category,
    CASE
        WHEN dc.utilization_percentage >= 120 THEN '#8B0000'  -- Dark red
        WHEN dc.utilization_percentage >= 100 THEN '#FF0000'  -- Red
        WHEN dc.utilization_percentage >= 80 THEN '#FFA500'   -- Orange
        WHEN dc.utilization_percentage >= 60 THEN '#00FF00'   -- Green
        WHEN dc.utilization_percentage >= 40 THEN '#90EE90'   -- Light green
        WHEN dc.utilization_percentage > 0 THEN '#ADD8E6'     -- Light blue
        ELSE '#F0F0F0'                                        -- Light gray
    END as heat_color,
    NOW() as last_updated
FROM daily_capacity dc;

-- Create indexes for performance
CREATE INDEX idx_heatmap_date ON daily_capacity_heatmap(date);
CREATE INDEX idx_heatmap_employee ON daily_capacity_heatmap(employee_id);
CREATE INDEX idx_heatmap_department ON daily_capacity_heatmap(department_id);
CREATE INDEX idx_heatmap_lookup ON daily_capacity_heatmap(employee_id, date);
CREATE INDEX idx_heatmap_category ON daily_capacity_heatmap(utilization_category);
CREATE INDEX idx_heatmap_year_month ON daily_capacity_heatmap(year, month);

-- Create weekly summary view
CREATE VIEW weekly_capacity_summary AS
SELECT
    employee_id,
    employee_name,
    department_id,
    department_name,
    year,
    week,
    AVG(available_hours) as avg_available_hours,
    AVG(allocated_hours) as avg_allocated_hours,
    AVG(utilization_percentage) as avg_utilization,
    MAX(utilization_percentage) as peak_utilization,
    MIN(utilization_percentage) as min_utilization,
    COUNT(CASE WHEN utilization_category IN ('critical', 'over') THEN 1 END) as overallocation_days,
    COUNT(CASE WHEN available_hours > 0 THEN 1 END) as working_days
FROM daily_capacity_heatmap
GROUP BY employee_id, employee_name, department_id, department_name, year, week;

-- Create monthly summary view
CREATE VIEW monthly_capacity_summary AS
SELECT
    employee_id,
    employee_name,
    department_id,
    department_name,
    year,
    month,
    AVG(available_hours) as avg_available_hours,
    AVG(allocated_hours) as avg_allocated_hours,
    AVG(utilization_percentage) as avg_utilization,
    MAX(utilization_percentage) as peak_utilization,
    MIN(utilization_percentage) as min_utilization,
    COUNT(CASE WHEN utilization_category IN ('critical', 'over') THEN 1 END) as overallocation_days,
    COUNT(CASE WHEN available_hours > 0 THEN 1 END) as working_days,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY utilization_percentage) as median_utilization,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY utilization_percentage) as p75_utilization,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY utilization_percentage) as p95_utilization
FROM daily_capacity_heatmap
GROUP BY employee_id, employee_name, department_id, department_name, year, month;

-- Create refresh function for the materialized view
CREATE OR REPLACE FUNCTION refresh_capacity_heatmap()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_capacity_heatmap;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to auto-refresh on data changes
CREATE OR REPLACE FUNCTION trigger_capacity_recalculation()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark for refresh (async job will handle actual refresh)
    INSERT INTO refresh_queue (view_name, requested_at)
    VALUES ('daily_capacity_heatmap', NOW())
    ON CONFLICT (view_name)
    DO UPDATE SET requested_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create refresh queue table if not exists
CREATE TABLE IF NOT EXISTS refresh_queue (
    view_name TEXT PRIMARY KEY,
    requested_at TIMESTAMP NOT NULL,
    processed_at TIMESTAMP,
    processing_started_at TIMESTAMP
);

-- Drop and recreate triggers on related tables
DROP TRIGGER IF EXISTS refresh_heatmap_on_allocation_change ON resource_allocations;
CREATE TRIGGER refresh_heatmap_on_allocation_change
AFTER INSERT OR UPDATE OR DELETE ON resource_allocations
FOR EACH STATEMENT EXECUTE FUNCTION trigger_capacity_recalculation();

DROP TRIGGER IF EXISTS refresh_heatmap_on_availability_change ON availability_patterns;
CREATE TRIGGER refresh_heatmap_on_availability_change
AFTER INSERT OR UPDATE OR DELETE ON availability_patterns
FOR EACH STATEMENT EXECUTE FUNCTION trigger_capacity_recalculation();

DROP TRIGGER IF EXISTS refresh_heatmap_on_exception_change ON availability_exceptions;
CREATE TRIGGER refresh_heatmap_on_exception_change
AFTER INSERT OR UPDATE OR DELETE ON availability_exceptions
FOR EACH STATEMENT EXECUTE FUNCTION trigger_capacity_recalculation();

-- Indexes on availability_exceptions are already created in existing table

-- Initial population of the materialized view
REFRESH MATERIALIZED VIEW daily_capacity_heatmap;

-- Grant appropriate permissions
GRANT SELECT ON daily_capacity_heatmap TO PUBLIC;
GRANT SELECT ON weekly_capacity_summary TO PUBLIC;
GRANT SELECT ON monthly_capacity_summary TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON refresh_queue TO PUBLIC;

-- Add comment for documentation
COMMENT ON MATERIALIZED VIEW daily_capacity_heatmap IS 'Phase 1: Daily capacity heat map data for visual resource utilization tracking. Refreshed every 15 minutes via cron job.';
COMMENT ON VIEW weekly_capacity_summary IS 'Weekly aggregation of capacity data for trend analysis';
COMMENT ON VIEW monthly_capacity_summary IS 'Monthly aggregation of capacity data with statistical percentiles';
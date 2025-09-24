-- Migration: 030_heatmap_performance_views
-- Description: Performance optimized materialized views and indexes for capacity heat maps
-- Author: Resource Management System
-- Date: 2024-01-22

-- ============================================
-- ENABLE EXTENSIONS
-- ============================================

-- Enable pg_trgm for text search optimization
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable btree_gin for combined indexes
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- ============================================
-- CREATE MATERIALIZED VIEWS
-- ============================================

-- Daily capacity heat map view
-- Aggregates capacity data per employee per day for fast heat map rendering
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_capacity_heatmap AS
WITH date_range AS (
    -- Generate dates for the next 6 months (adjustable)
    SELECT generate_series(
        CURRENT_DATE - INTERVAL '3 months',
        CURRENT_DATE + INTERVAL '6 months',
        '1 day'::interval
    )::date as capacity_date
),
employee_daily_capacity AS (
    SELECT
        e.id as employee_id,
        e.first_name,
        e.last_name,
        e.email,
        e.department_id,
        d.name as department_name,
        e.daily_capacity_hours,
        e.is_active as employee_active,
        dr.capacity_date
    FROM employees e
    CROSS JOIN date_range dr
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE e.is_active = true
),
daily_allocations AS (
    SELECT
        ra.employee_id,
        dr.capacity_date,
        SUM(
            CASE
                WHEN dr.capacity_date BETWEEN ra.start_date AND ra.end_date
                THEN ra.allocated_hours
                ELSE 0
            END
        ) as allocated_hours,
        COUNT(DISTINCT
            CASE
                WHEN dr.capacity_date BETWEEN ra.start_date AND ra.end_date
                THEN ra.project_id
            END
        ) as project_count,
        ARRAY_AGG(DISTINCT
            CASE
                WHEN dr.capacity_date BETWEEN ra.start_date AND ra.end_date
                THEN p.name
            END
        ) FILTER (WHERE p.name IS NOT NULL) as project_names
    FROM resource_allocations ra
    CROSS JOIN date_range dr
    LEFT JOIN projects p ON p.id = ra.project_id
    WHERE ra.is_active = true
    GROUP BY ra.employee_id, dr.capacity_date
),
availability_adjustments AS (
    SELECT
        ap.employee_id,
        dr.capacity_date,
        -- Get effective availability pattern
        CASE
            WHEN dr.capacity_date BETWEEN ap.effective_from AND COALESCE(ap.effective_to, '9999-12-31')
            THEN ap.configuration
            ELSE NULL
        END as pattern_config,
        -- Check for exceptions
        EXISTS (
            SELECT 1 FROM availability_exceptions ae
            WHERE ae.employee_id = ap.employee_id
            AND dr.capacity_date BETWEEN ae.exception_date AND ae.exception_end_date
        ) as has_exception,
        -- Get exception hours if any
        (
            SELECT ae.hours_available
            FROM availability_exceptions ae
            WHERE ae.employee_id = ap.employee_id
            AND dr.capacity_date BETWEEN ae.exception_date AND ae.exception_end_date
            ORDER BY ae.created_at DESC
            LIMIT 1
        ) as exception_hours
    FROM availability_patterns ap
    CROSS JOIN date_range dr
    WHERE ap.is_active = true
),
holiday_adjustments AS (
    SELECT
        hc.holiday_date,
        hc.name as holiday_name,
        hc.is_company_wide
    FROM holiday_calendar hc
    WHERE hc.is_active = true
)
SELECT
    edc.employee_id,
    edc.first_name,
    edc.last_name,
    edc.email,
    edc.department_id,
    edc.department_name,
    edc.capacity_date,
    EXTRACT(YEAR FROM edc.capacity_date) as year,
    EXTRACT(MONTH FROM edc.capacity_date) as month,
    EXTRACT(WEEK FROM edc.capacity_date) as week_number,
    EXTRACT(DOW FROM edc.capacity_date) as day_of_week,

    -- Capacity calculations
    CASE
        WHEN ha.holiday_date IS NOT NULL AND ha.is_company_wide THEN 0
        WHEN aa.has_exception THEN COALESCE(aa.exception_hours, 0)
        WHEN aa.pattern_config IS NOT NULL THEN
            -- Parse pattern config to get daily hours (simplified, real implementation would parse JSONB)
            COALESCE((aa.pattern_config->>'daily_hours')::numeric, edc.daily_capacity_hours)
        ELSE edc.daily_capacity_hours
    END as available_hours,

    COALESCE(da.allocated_hours, 0) as allocated_hours,

    -- Utilization calculation
    CASE
        WHEN CASE
                WHEN ha.holiday_date IS NOT NULL AND ha.is_company_wide THEN 0
                WHEN aa.has_exception THEN COALESCE(aa.exception_hours, 0)
                WHEN aa.pattern_config IS NOT NULL THEN
                    COALESCE((aa.pattern_config->>'daily_hours')::numeric, edc.daily_capacity_hours)
                ELSE edc.daily_capacity_hours
            END = 0 THEN 0
        ELSE ROUND((COALESCE(da.allocated_hours, 0) /
            CASE
                WHEN ha.holiday_date IS NOT NULL AND ha.is_company_wide THEN 1  -- Avoid division by zero
                WHEN aa.has_exception THEN GREATEST(COALESCE(aa.exception_hours, 1), 1)
                WHEN aa.pattern_config IS NOT NULL THEN
                    GREATEST(COALESCE((aa.pattern_config->>'daily_hours')::numeric, edc.daily_capacity_hours), 1)
                ELSE GREATEST(edc.daily_capacity_hours, 1)
            END) * 100, 2)
    END as utilization_percentage,

    -- Heat map color based on thresholds (green: 0-70%, blue: 71-85%, yellow: 86-95%, red: 96%+)
    CASE
        WHEN COALESCE(da.allocated_hours, 0) = 0 THEN 'available'
        WHEN CASE
                WHEN ha.holiday_date IS NOT NULL AND ha.is_company_wide THEN 0
                WHEN aa.has_exception THEN COALESCE(aa.exception_hours, 0)
                WHEN aa.pattern_config IS NOT NULL THEN
                    COALESCE((aa.pattern_config->>'daily_hours')::numeric, edc.daily_capacity_hours)
                ELSE edc.daily_capacity_hours
            END = 0 THEN 'unavailable'
        WHEN (COALESCE(da.allocated_hours, 0) /
            GREATEST(CASE
                WHEN ha.holiday_date IS NOT NULL AND ha.is_company_wide THEN 1
                WHEN aa.has_exception THEN COALESCE(aa.exception_hours, 1)
                WHEN aa.pattern_config IS NOT NULL THEN
                    COALESCE((aa.pattern_config->>'daily_hours')::numeric, edc.daily_capacity_hours)
                ELSE edc.daily_capacity_hours
            END, 1)) <= 0.70 THEN 'green'
        WHEN (COALESCE(da.allocated_hours, 0) /
            GREATEST(CASE
                WHEN ha.holiday_date IS NOT NULL AND ha.is_company_wide THEN 1
                WHEN aa.has_exception THEN COALESCE(aa.exception_hours, 1)
                WHEN aa.pattern_config IS NOT NULL THEN
                    COALESCE((aa.pattern_config->>'daily_hours')::numeric, edc.daily_capacity_hours)
                ELSE edc.daily_capacity_hours
            END, 1)) <= 0.85 THEN 'blue'
        WHEN (COALESCE(da.allocated_hours, 0) /
            GREATEST(CASE
                WHEN ha.holiday_date IS NOT NULL AND ha.is_company_wide THEN 1
                WHEN aa.has_exception THEN COALESCE(aa.exception_hours, 1)
                WHEN aa.pattern_config IS NOT NULL THEN
                    COALESCE((aa.pattern_config->>'daily_hours')::numeric, edc.daily_capacity_hours)
                ELSE edc.daily_capacity_hours
            END, 1)) <= 0.95 THEN 'yellow'
        ELSE 'red'
    END as heat_level,

    -- Additional context
    COALESCE(da.project_count, 0) as project_count,
    da.project_names,
    ha.holiday_name,
    aa.has_exception as has_availability_exception,

    -- Timestamps for cache management
    CURRENT_TIMESTAMP as last_refreshed

FROM employee_daily_capacity edc
LEFT JOIN daily_allocations da ON
    da.employee_id = edc.employee_id AND
    da.capacity_date = edc.capacity_date
LEFT JOIN availability_adjustments aa ON
    aa.employee_id = edc.employee_id AND
    aa.capacity_date = edc.capacity_date
LEFT JOIN holiday_adjustments ha ON
    ha.holiday_date = edc.capacity_date
WHERE edc.capacity_date >= CURRENT_DATE - INTERVAL '3 months'
  AND edc.capacity_date <= CURRENT_DATE + INTERVAL '6 months';

-- Weekly capacity heat map view
-- Aggregates capacity data per employee per week
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_weekly_capacity_heatmap AS
SELECT
    employee_id,
    first_name,
    last_name,
    email,
    department_id,
    department_name,
    year,
    week_number,
    MIN(capacity_date) as week_start_date,
    MAX(capacity_date) as week_end_date,

    -- Weekly aggregations
    SUM(available_hours) as weekly_available_hours,
    SUM(allocated_hours) as weekly_allocated_hours,

    -- Average utilization for the week
    CASE
        WHEN SUM(available_hours) > 0
        THEN ROUND((SUM(allocated_hours) / SUM(available_hours)) * 100, 2)
        ELSE 0
    END as avg_utilization_percentage,

    -- Peak utilization day in the week
    MAX(utilization_percentage) as peak_utilization_percentage,

    -- Heat level for the week (based on average)
    CASE
        WHEN SUM(available_hours) = 0 THEN 'unavailable'
        WHEN SUM(allocated_hours) = 0 THEN 'available'
        WHEN (SUM(allocated_hours) / GREATEST(SUM(available_hours), 1)) <= 0.70 THEN 'green'
        WHEN (SUM(allocated_hours) / GREATEST(SUM(available_hours), 1)) <= 0.85 THEN 'blue'
        WHEN (SUM(allocated_hours) / GREATEST(SUM(available_hours), 1)) <= 0.95 THEN 'yellow'
        ELSE 'red'
    END as heat_level,

    -- Project involvement
    COUNT(DISTINCT UNNEST(project_names)) as unique_projects,
    ARRAY_AGG(DISTINCT UNNEST(project_names)) FILTER (WHERE project_names IS NOT NULL) as all_project_names,

    -- Working days (excluding holidays and zero availability)
    COUNT(CASE WHEN available_hours > 0 THEN 1 END) as working_days,
    COUNT(CASE WHEN heat_level = 'red' THEN 1 END) as over_allocated_days,

    MAX(last_refreshed) as last_refreshed

FROM mv_daily_capacity_heatmap
GROUP BY
    employee_id, first_name, last_name, email,
    department_id, department_name, year, week_number;

-- Department capacity summary view
-- Aggregates capacity at department level
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_department_capacity_summary AS
SELECT
    d.id as department_id,
    d.name as department_name,
    d.code as department_code,
    dch.capacity_date,
    dch.year,
    dch.month,
    dch.week_number,

    -- Department totals
    COUNT(DISTINCT dch.employee_id) as total_employees,
    SUM(dch.available_hours) as total_available_hours,
    SUM(dch.allocated_hours) as total_allocated_hours,

    -- Average utilization across department
    CASE
        WHEN SUM(dch.available_hours) > 0
        THEN ROUND((SUM(dch.allocated_hours) / SUM(dch.available_hours)) * 100, 2)
        ELSE 0
    END as avg_utilization_percentage,

    -- Capacity distribution
    COUNT(CASE WHEN dch.heat_level = 'available' THEN 1 END) as available_count,
    COUNT(CASE WHEN dch.heat_level = 'green' THEN 1 END) as green_count,
    COUNT(CASE WHEN dch.heat_level = 'blue' THEN 1 END) as blue_count,
    COUNT(CASE WHEN dch.heat_level = 'yellow' THEN 1 END) as yellow_count,
    COUNT(CASE WHEN dch.heat_level = 'red' THEN 1 END) as red_count,
    COUNT(CASE WHEN dch.heat_level = 'unavailable' THEN 1 END) as unavailable_count,

    -- Department heat level (based on average utilization)
    CASE
        WHEN SUM(dch.available_hours) = 0 THEN 'unavailable'
        WHEN SUM(dch.allocated_hours) = 0 THEN 'available'
        WHEN (SUM(dch.allocated_hours) / GREATEST(SUM(dch.available_hours), 1)) <= 0.70 THEN 'green'
        WHEN (SUM(dch.allocated_hours) / GREATEST(SUM(dch.available_hours), 1)) <= 0.85 THEN 'blue'
        WHEN (SUM(dch.allocated_hours) / GREATEST(SUM(dch.available_hours), 1)) <= 0.95 THEN 'yellow'
        ELSE 'red'
    END as department_heat_level,

    -- Project diversity
    COUNT(DISTINCT UNNEST(dch.project_names)) as unique_projects,

    MAX(dch.last_refreshed) as last_refreshed

FROM departments d
LEFT JOIN mv_daily_capacity_heatmap dch ON dch.department_id = d.id
WHERE d.is_active = true
GROUP BY
    d.id, d.name, d.code, dch.capacity_date,
    dch.year, dch.month, dch.week_number;

-- Capacity bottlenecks view
-- Identifies resources and periods with capacity issues
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_capacity_bottlenecks AS
WITH bottleneck_periods AS (
    SELECT
        employee_id,
        first_name,
        last_name,
        department_name,
        capacity_date,
        utilization_percentage,
        heat_level,
        allocated_hours,
        available_hours,
        project_names,

        -- Identify consecutive over-allocated periods
        SUM(CASE WHEN heat_level IN ('red', 'yellow') THEN 0 ELSE 1 END)
            OVER (PARTITION BY employee_id ORDER BY capacity_date) as bottleneck_group

    FROM mv_daily_capacity_heatmap
    WHERE capacity_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 months'
)
SELECT
    employee_id,
    first_name,
    last_name,
    department_name,
    MIN(capacity_date) as bottleneck_start_date,
    MAX(capacity_date) as bottleneck_end_date,
    COUNT(*) as consecutive_days,
    AVG(utilization_percentage) as avg_utilization,
    MAX(utilization_percentage) as peak_utilization,
    SUM(allocated_hours - available_hours) as total_over_allocated_hours,
    ARRAY_AGG(DISTINCT UNNEST(project_names)) FILTER (WHERE project_names IS NOT NULL) as affected_projects,

    -- Severity classification
    CASE
        WHEN MAX(utilization_percentage) > 120 AND COUNT(*) > 5 THEN 'critical'
        WHEN MAX(utilization_percentage) > 100 AND COUNT(*) > 3 THEN 'high'
        WHEN AVG(utilization_percentage) > 95 THEN 'medium'
        ELSE 'low'
    END as bottleneck_severity,

    CURRENT_TIMESTAMP as identified_at

FROM bottleneck_periods
WHERE heat_level IN ('red', 'yellow')
GROUP BY
    employee_id, first_name, last_name, department_name, bottleneck_group
HAVING COUNT(*) >= 3  -- Only show bottlenecks of 3+ consecutive days
ORDER BY
    bottleneck_severity DESC,
    bottleneck_start_date;

-- ============================================
-- CREATE INDEXES FOR MATERIALIZED VIEWS
-- ============================================

-- Daily capacity heat map indexes
CREATE UNIQUE INDEX idx_mv_daily_capacity_unique
ON mv_daily_capacity_heatmap(employee_id, capacity_date);

CREATE INDEX idx_mv_daily_capacity_date
ON mv_daily_capacity_heatmap(capacity_date);

CREATE INDEX idx_mv_daily_capacity_employee_date
ON mv_daily_capacity_heatmap(employee_id, capacity_date DESC);

CREATE INDEX idx_mv_daily_capacity_department_date
ON mv_daily_capacity_heatmap(department_id, capacity_date);

CREATE INDEX idx_mv_daily_capacity_heat_level
ON mv_daily_capacity_heatmap(heat_level, capacity_date)
WHERE heat_level IN ('yellow', 'red');

CREATE INDEX idx_mv_daily_capacity_utilization
ON mv_daily_capacity_heatmap(utilization_percentage DESC)
WHERE utilization_percentage > 85;

-- Weekly capacity heat map indexes
CREATE UNIQUE INDEX idx_mv_weekly_capacity_unique
ON mv_weekly_capacity_heatmap(employee_id, year, week_number);

CREATE INDEX idx_mv_weekly_capacity_employee
ON mv_weekly_capacity_heatmap(employee_id, year DESC, week_number DESC);

CREATE INDEX idx_mv_weekly_capacity_department
ON mv_weekly_capacity_heatmap(department_id, year DESC, week_number DESC);

CREATE INDEX idx_mv_weekly_capacity_heat
ON mv_weekly_capacity_heatmap(heat_level, year DESC, week_number DESC);

-- Department capacity summary indexes
CREATE UNIQUE INDEX idx_mv_department_capacity_unique
ON mv_department_capacity_summary(department_id, capacity_date);

CREATE INDEX idx_mv_department_capacity_date
ON mv_department_capacity_summary(capacity_date DESC);

CREATE INDEX idx_mv_department_capacity_heat
ON mv_department_capacity_summary(department_heat_level, capacity_date)
WHERE department_heat_level IN ('yellow', 'red');

-- Bottlenecks indexes
CREATE INDEX idx_mv_bottlenecks_employee
ON mv_capacity_bottlenecks(employee_id, bottleneck_start_date);

CREATE INDEX idx_mv_bottlenecks_severity
ON mv_capacity_bottlenecks(bottleneck_severity, bottleneck_start_date);

CREATE INDEX idx_mv_bottlenecks_department
ON mv_capacity_bottlenecks(department_name, bottleneck_severity);

-- ============================================
-- CREATE REFRESH FUNCTIONS
-- ============================================

-- Function to refresh all heat map materialized views
CREATE OR REPLACE FUNCTION refresh_heatmap_views(
    p_concurrent BOOLEAN DEFAULT true
) RETURNS TABLE (
    view_name TEXT,
    refresh_duration INTERVAL,
    row_count BIGINT
) AS $$
DECLARE
    v_start_time TIMESTAMP;
    v_end_time TIMESTAMP;
    v_row_count BIGINT;
BEGIN
    -- Refresh daily capacity (base view)
    v_start_time := clock_timestamp();

    IF p_concurrent THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_capacity_heatmap;
    ELSE
        REFRESH MATERIALIZED VIEW mv_daily_capacity_heatmap;
    END IF;

    v_end_time := clock_timestamp();
    SELECT COUNT(*) INTO v_row_count FROM mv_daily_capacity_heatmap;

    RETURN QUERY
    SELECT 'mv_daily_capacity_heatmap'::TEXT,
           (v_end_time - v_start_time),
           v_row_count;

    -- Refresh weekly capacity
    v_start_time := clock_timestamp();

    IF p_concurrent THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_weekly_capacity_heatmap;
    ELSE
        REFRESH MATERIALIZED VIEW mv_weekly_capacity_heatmap;
    END IF;

    v_end_time := clock_timestamp();
    SELECT COUNT(*) INTO v_row_count FROM mv_weekly_capacity_heatmap;

    RETURN QUERY
    SELECT 'mv_weekly_capacity_heatmap'::TEXT,
           (v_end_time - v_start_time),
           v_row_count;

    -- Refresh department summary
    v_start_time := clock_timestamp();

    IF p_concurrent THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_department_capacity_summary;
    ELSE
        REFRESH MATERIALIZED VIEW mv_department_capacity_summary;
    END IF;

    v_end_time := clock_timestamp();
    SELECT COUNT(*) INTO v_row_count FROM mv_department_capacity_summary;

    RETURN QUERY
    SELECT 'mv_department_capacity_summary'::TEXT,
           (v_end_time - v_start_time),
           v_row_count;

    -- Refresh bottlenecks
    v_start_time := clock_timestamp();

    IF p_concurrent THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_capacity_bottlenecks;
    ELSE
        REFRESH MATERIALIZED VIEW mv_capacity_bottlenecks;
    END IF;

    v_end_time := clock_timestamp();
    SELECT COUNT(*) INTO v_row_count FROM mv_capacity_bottlenecks;

    RETURN QUERY
    SELECT 'mv_capacity_bottlenecks'::TEXT,
           (v_end_time - v_start_time),
           v_row_count;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Function to get heat map data for a specific date range
CREATE OR REPLACE FUNCTION get_heatmap_data(
    p_start_date DATE,
    p_end_date DATE,
    p_department_id UUID DEFAULT NULL,
    p_employee_ids UUID[] DEFAULT NULL,
    p_granularity TEXT DEFAULT 'daily'  -- 'daily' or 'weekly'
) RETURNS TABLE (
    entity_id UUID,
    entity_name TEXT,
    entity_type TEXT,
    period_date DATE,
    period_label TEXT,
    available_hours NUMERIC,
    allocated_hours NUMERIC,
    utilization_percentage NUMERIC,
    heat_level TEXT,
    project_count INTEGER,
    project_names TEXT[]
) AS $$
BEGIN
    IF p_granularity = 'weekly' THEN
        RETURN QUERY
        SELECT
            w.employee_id as entity_id,
            CONCAT(w.first_name, ' ', w.last_name) as entity_name,
            'employee'::TEXT as entity_type,
            w.week_start_date as period_date,
            CONCAT('Week ', w.week_number, ' (',
                   TO_CHAR(w.week_start_date, 'Mon DD'), ' - ',
                   TO_CHAR(w.week_end_date, 'Mon DD'), ')') as period_label,
            w.weekly_available_hours as available_hours,
            w.weekly_allocated_hours as allocated_hours,
            w.avg_utilization_percentage as utilization_percentage,
            w.heat_level,
            w.unique_projects as project_count,
            w.all_project_names as project_names
        FROM mv_weekly_capacity_heatmap w
        WHERE w.week_start_date <= p_end_date
          AND w.week_end_date >= p_start_date
          AND (p_department_id IS NULL OR w.department_id = p_department_id)
          AND (p_employee_ids IS NULL OR w.employee_id = ANY(p_employee_ids))
        ORDER BY w.employee_id, w.week_start_date;
    ELSE
        RETURN QUERY
        SELECT
            d.employee_id as entity_id,
            CONCAT(d.first_name, ' ', d.last_name) as entity_name,
            'employee'::TEXT as entity_type,
            d.capacity_date as period_date,
            TO_CHAR(d.capacity_date, 'Mon DD, YYYY') as period_label,
            d.available_hours,
            d.allocated_hours,
            d.utilization_percentage,
            d.heat_level,
            d.project_count,
            d.project_names
        FROM mv_daily_capacity_heatmap d
        WHERE d.capacity_date BETWEEN p_start_date AND p_end_date
          AND (p_department_id IS NULL OR d.department_id = p_department_id)
          AND (p_employee_ids IS NULL OR d.employee_id = ANY(p_employee_ids))
        ORDER BY d.employee_id, d.capacity_date;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- CREATE TRIGGERS FOR AUTO-REFRESH
-- ============================================

-- Function to mark views for refresh when underlying data changes
CREATE OR REPLACE FUNCTION mark_heatmap_views_stale()
RETURNS TRIGGER AS $$
BEGIN
    -- In production, this would update a tracking table
    -- that a background job checks to refresh views
    -- For now, we'll just log that a refresh is needed

    INSERT INTO capacity_recalculation_log (
        trigger_source,
        affected_entity_type,
        affected_entity_id,
        recalculation_needed,
        created_at
    ) VALUES (
        TG_TABLE_NAME,
        'heatmap_views',
        COALESCE(NEW.id, OLD.id),
        true,
        CURRENT_TIMESTAMP
    ) ON CONFLICT DO NOTHING;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Add triggers to relevant tables
CREATE TRIGGER trg_allocations_heatmap_refresh
    AFTER INSERT OR UPDATE OR DELETE ON resource_allocations
    FOR EACH STATEMENT
    EXECUTE FUNCTION mark_heatmap_views_stale();

CREATE TRIGGER trg_employees_heatmap_refresh
    AFTER INSERT OR UPDATE OR DELETE ON employees
    FOR EACH STATEMENT
    EXECUTE FUNCTION mark_heatmap_views_stale();

CREATE TRIGGER trg_availability_heatmap_refresh
    AFTER INSERT OR UPDATE OR DELETE ON availability_patterns
    FOR EACH STATEMENT
    EXECUTE FUNCTION mark_heatmap_views_stale();

CREATE TRIGGER trg_holidays_heatmap_refresh
    AFTER INSERT OR UPDATE OR DELETE ON holiday_calendar
    FOR EACH STATEMENT
    EXECUTE FUNCTION mark_heatmap_views_stale();

-- ============================================
-- INITIAL REFRESH
-- ============================================

-- Perform initial refresh of all views
SELECT * FROM refresh_heatmap_views(false);

-- ============================================
-- DOCUMENTATION
-- ============================================

COMMENT ON MATERIALIZED VIEW mv_daily_capacity_heatmap IS
'Performance-optimized daily capacity heat map data. Refreshed every 15 minutes in production.';

COMMENT ON MATERIALIZED VIEW mv_weekly_capacity_heatmap IS
'Weekly aggregated capacity heat map for trend analysis. Derived from daily heat map.';

COMMENT ON MATERIALIZED VIEW mv_department_capacity_summary IS
'Department-level capacity rollup for organizational views.';

COMMENT ON MATERIALIZED VIEW mv_capacity_bottlenecks IS
'Identifies consecutive periods of high utilization that may need attention.';

COMMENT ON FUNCTION refresh_heatmap_views IS
'Refreshes all heat map materialized views. Use concurrent=true in production to avoid blocking.';

COMMENT ON FUNCTION get_heatmap_data IS
'Retrieves heat map data for specified date range and filters. Optimized for UI rendering.';

-- ============================================
-- ROLLBACK SCRIPT (DOWN MIGRATION)
-- ============================================

/*
-- To rollback this migration, run:

-- Drop triggers
DROP TRIGGER IF EXISTS trg_allocations_heatmap_refresh ON resource_allocations;
DROP TRIGGER IF EXISTS trg_employees_heatmap_refresh ON employees;
DROP TRIGGER IF EXISTS trg_availability_heatmap_refresh ON availability_patterns;
DROP TRIGGER IF EXISTS trg_holidays_heatmap_refresh ON holiday_calendar;

-- Drop functions
DROP FUNCTION IF EXISTS mark_heatmap_views_stale();
DROP FUNCTION IF EXISTS get_heatmap_data(DATE, DATE, UUID, UUID[], TEXT);
DROP FUNCTION IF EXISTS refresh_heatmap_views(BOOLEAN);

-- Drop indexes
DROP INDEX IF EXISTS idx_mv_daily_capacity_unique;
DROP INDEX IF EXISTS idx_mv_daily_capacity_date;
DROP INDEX IF EXISTS idx_mv_daily_capacity_employee_date;
DROP INDEX IF EXISTS idx_mv_daily_capacity_department_date;
DROP INDEX IF EXISTS idx_mv_daily_capacity_heat_level;
DROP INDEX IF EXISTS idx_mv_daily_capacity_utilization;
DROP INDEX IF EXISTS idx_mv_weekly_capacity_unique;
DROP INDEX IF EXISTS idx_mv_weekly_capacity_employee;
DROP INDEX IF EXISTS idx_mv_weekly_capacity_department;
DROP INDEX IF EXISTS idx_mv_weekly_capacity_heat;
DROP INDEX IF EXISTS idx_mv_department_capacity_unique;
DROP INDEX IF EXISTS idx_mv_department_capacity_date;
DROP INDEX IF EXISTS idx_mv_department_capacity_heat;
DROP INDEX IF EXISTS idx_mv_bottlenecks_employee;
DROP INDEX IF EXISTS idx_mv_bottlenecks_severity;
DROP INDEX IF EXISTS idx_mv_bottlenecks_department;

-- Drop materialized views
DROP MATERIALIZED VIEW IF EXISTS mv_capacity_bottlenecks;
DROP MATERIALIZED VIEW IF EXISTS mv_department_capacity_summary;
DROP MATERIALIZED VIEW IF EXISTS mv_weekly_capacity_heatmap;
DROP MATERIALIZED VIEW IF EXISTS mv_daily_capacity_heatmap;

-- Note: We don't remove extensions as they might be used by other migrations
*/
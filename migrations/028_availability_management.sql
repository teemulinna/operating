-- Migration: 028_availability_management
-- Description: Advanced availability management with patterns, holidays, and exceptions
-- Author: Resource Management System
-- Date: 2024-01-22

-- ============================================
-- PREREQUISITES
-- ============================================

-- Ensure pgcrypto is enabled (from migration 027, but safe to re-run)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- CREATE ENUM TYPES
-- ============================================

-- Enum for availability pattern types
DO $$ BEGIN
    CREATE TYPE availability_pattern_type AS ENUM (
        'weekly',       -- Standard weekly pattern (e.g., Mon-Fri 9-5)
        'biweekly',     -- Alternating weekly pattern
        'monthly',      -- Monthly pattern
        'custom'        -- Custom pattern with specific dates
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum for exception types
DO $$ BEGIN
    CREATE TYPE availability_exception_type AS ENUM (
        'holiday',      -- Company or public holiday
        'pto',          -- Paid time off / vacation
        'sick',         -- Sick leave
        'training',     -- Training or conference
        'other'         -- Other absence
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- CREATE TABLES
-- ============================================

-- Availability patterns table for recurring schedules
CREATE TABLE IF NOT EXISTS availability_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    pattern_type availability_pattern_type NOT NULL DEFAULT 'weekly',
    pattern_name VARCHAR(100),

    -- JSONB configuration for flexible pattern storage
    -- Example for weekly: {"monday": {"start": "09:00", "end": "17:00", "hours": 8}, ...}
    -- Example for custom: {"dates": [{"date": "2024-01-15", "hours": 4}, ...]}
    configuration JSONB NOT NULL,

    -- Effective date range
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,

    -- Pattern priority (higher number = higher priority)
    priority INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 100),

    is_active BOOLEAN DEFAULT true,
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES employees(id) ON DELETE SET NULL,

    -- Ensure effective_from is before effective_to
    CONSTRAINT chk_pattern_date_range CHECK (
        effective_to IS NULL OR effective_from <= effective_to
    ),

    -- Ensure configuration has required structure based on pattern_type
    CONSTRAINT chk_pattern_configuration CHECK (
        (pattern_type = 'weekly' AND configuration ? 'monday') OR
        (pattern_type = 'biweekly' AND configuration ? 'week1' AND configuration ? 'week2') OR
        (pattern_type = 'monthly' AND configuration ? 'days') OR
        (pattern_type = 'custom' AND configuration ? 'dates')
    )
);

-- Holiday calendar table for company and public holidays
CREATE TABLE IF NOT EXISTS holiday_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    holiday_date DATE NOT NULL,
    holiday_name VARCHAR(100) NOT NULL,
    holiday_type VARCHAR(50) DEFAULT 'company', -- company, public, regional

    -- Location/region information for regional holidays
    country VARCHAR(2),      -- ISO country code
    region VARCHAR(50),       -- State/province/region

    is_company_wide BOOLEAN DEFAULT true,
    is_paid BOOLEAN DEFAULT true,

    -- Optional fields for flexible holidays
    applies_to_departments UUID[] DEFAULT NULL, -- Array of department IDs
    applies_to_locations VARCHAR[] DEFAULT NULL, -- Array of location codes

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure holiday date is reasonable (not too far in past or future)
    CONSTRAINT chk_holiday_date_reasonable CHECK (
        holiday_date >= '2020-01-01'::DATE
        AND holiday_date <= CURRENT_DATE + INTERVAL '3 years'
    ),

    -- Prevent duplicate holidays on same date with same name
    CONSTRAINT uk_holiday_date_name UNIQUE(holiday_date, holiday_name)
);

-- Availability exceptions table for one-off changes
CREATE TABLE IF NOT EXISTS availability_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    exception_type availability_exception_type NOT NULL,

    -- Hours available on this date (0 for full day off)
    hours_available DECIMAL(4,2) DEFAULT 0
        CHECK (hours_available >= 0 AND hours_available <= 24),

    -- Time range if partial day
    start_time TIME,
    end_time TIME,

    -- Approval workflow
    requires_approval BOOLEAN DEFAULT true,
    approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_status VARCHAR(20) DEFAULT 'pending'
        CHECK (approval_status IN ('pending', 'approved', 'rejected', 'cancelled')),

    notes TEXT,

    -- Link to external systems if needed
    external_reference VARCHAR(100), -- e.g., HR system reference

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure exception date is reasonable
    CONSTRAINT chk_exception_date_reasonable CHECK (
        exception_date >= CURRENT_DATE - INTERVAL '1 year'
        AND exception_date <= CURRENT_DATE + INTERVAL '2 years'
    ),

    -- Ensure time range is valid if specified
    CONSTRAINT chk_exception_time_range CHECK (
        (start_time IS NULL AND end_time IS NULL) OR
        (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
    ),

    -- Prevent duplicate exceptions for same employee and date
    CONSTRAINT uk_employee_exception_date UNIQUE(employee_id, exception_date)
);

-- Capacity recalculation log table for tracking updates
CREATE TABLE IF NOT EXISTS capacity_recalculation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_type VARCHAR(50) NOT NULL, -- pattern_change, exception_added, holiday_added, manual
    trigger_id UUID, -- Reference to the triggering record

    affected_employee_ids UUID[],
    date_range_start DATE NOT NULL,
    date_range_end DATE NOT NULL,

    records_updated INTEGER DEFAULT 0,

    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,

    success BOOLEAN DEFAULT false,
    error_message TEXT,

    initiated_by UUID REFERENCES employees(id) ON DELETE SET NULL,

    -- Performance metrics
    execution_time_ms INTEGER,

    CONSTRAINT chk_recalc_date_range CHECK (date_range_start <= date_range_end)
);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Availability patterns indexes
CREATE INDEX idx_availability_patterns_employee_active
ON availability_patterns(employee_id, effective_from, effective_to)
WHERE is_active = true;

CREATE INDEX idx_availability_patterns_date_range
ON availability_patterns(effective_from, effective_to)
WHERE is_active = true;

CREATE INDEX idx_availability_patterns_priority
ON availability_patterns(employee_id, priority DESC)
WHERE is_active = true;

-- GIN index for JSONB configuration queries
CREATE INDEX idx_availability_patterns_config
ON availability_patterns USING GIN (configuration);

-- Holiday calendar indexes
CREATE INDEX idx_holiday_calendar_date
ON holiday_calendar(holiday_date);

CREATE INDEX idx_holiday_calendar_year_month
ON holiday_calendar(EXTRACT(YEAR FROM holiday_date), EXTRACT(MONTH FROM holiday_date));

CREATE INDEX idx_holiday_calendar_company_wide
ON holiday_calendar(holiday_date)
WHERE is_company_wide = true;

-- GIN index for department arrays
CREATE INDEX idx_holiday_calendar_departments
ON holiday_calendar USING GIN (applies_to_departments)
WHERE applies_to_departments IS NOT NULL;

-- Availability exceptions indexes
CREATE INDEX idx_availability_exceptions_employee_date
ON availability_exceptions(employee_id, exception_date DESC);

CREATE INDEX idx_availability_exceptions_date_range
ON availability_exceptions(exception_date)
WHERE approval_status = 'approved';

CREATE INDEX idx_availability_exceptions_pending_approval
ON availability_exceptions(created_at DESC)
WHERE requires_approval = true AND approval_status = 'pending';

CREATE INDEX idx_availability_exceptions_type
ON availability_exceptions(exception_type, exception_date)
WHERE approval_status = 'approved';

-- Capacity recalculation log indexes
CREATE INDEX idx_capacity_recalc_log_date
ON capacity_recalculation_log(started_at DESC);

CREATE INDEX idx_capacity_recalc_log_trigger
ON capacity_recalculation_log(trigger_type, trigger_id)
WHERE trigger_id IS NOT NULL;

-- ============================================
-- CREATE FUNCTIONS
-- ============================================

-- Function to get effective availability pattern for an employee on a date
CREATE OR REPLACE FUNCTION get_effective_availability_pattern(
    p_employee_id UUID,
    p_date DATE
) RETURNS JSONB AS $$
DECLARE
    v_pattern RECORD;
BEGIN
    -- Get the highest priority active pattern for the date
    SELECT configuration, pattern_type
    INTO v_pattern
    FROM availability_patterns
    WHERE employee_id = p_employee_id
    AND is_active = true
    AND p_date BETWEEN effective_from AND COALESCE(effective_to, '9999-12-31'::DATE)
    ORDER BY priority DESC, effective_from DESC
    LIMIT 1;

    IF v_pattern IS NULL THEN
        -- Return default pattern if none exists
        RETURN jsonb_build_object(
            'pattern_type', 'default',
            'monday', jsonb_build_object('hours', 8),
            'tuesday', jsonb_build_object('hours', 8),
            'wednesday', jsonb_build_object('hours', 8),
            'thursday', jsonb_build_object('hours', 8),
            'friday', jsonb_build_object('hours', 8),
            'saturday', jsonb_build_object('hours', 0),
            'sunday', jsonb_build_object('hours', 0)
        );
    END IF;

    RETURN v_pattern.configuration;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate available hours for an employee on a specific date
CREATE OR REPLACE FUNCTION calculate_available_hours(
    p_employee_id UUID,
    p_date DATE
) RETURNS DECIMAL(4,2) AS $$
DECLARE
    v_base_hours DECIMAL(4,2);
    v_exception_hours DECIMAL(4,2);
    v_is_holiday BOOLEAN;
    v_day_name TEXT;
    v_pattern JSONB;
BEGIN
    -- Check for approved exceptions first (highest priority)
    SELECT hours_available INTO v_exception_hours
    FROM availability_exceptions
    WHERE employee_id = p_employee_id
    AND exception_date = p_date
    AND approval_status = 'approved';

    IF v_exception_hours IS NOT NULL THEN
        RETURN v_exception_hours;
    END IF;

    -- Check if it's a company-wide holiday
    SELECT EXISTS(
        SELECT 1 FROM holiday_calendar
        WHERE holiday_date = p_date
        AND is_company_wide = true
    ) INTO v_is_holiday;

    IF v_is_holiday THEN
        RETURN 0;
    END IF;

    -- Get the effective pattern for this date
    v_pattern := get_effective_availability_pattern(p_employee_id, p_date);

    -- Get the day name (lowercase)
    v_day_name := LOWER(TO_CHAR(p_date, 'Day'));
    v_day_name := TRIM(v_day_name);

    -- Extract hours for the specific day from pattern
    IF v_pattern ? v_day_name THEN
        v_base_hours := (v_pattern -> v_day_name ->> 'hours')::DECIMAL(4,2);
    ELSE
        -- Default to employee's daily capacity or 8 hours
        SELECT COALESCE(daily_capacity_hours, 8.0) INTO v_base_hours
        FROM employees
        WHERE id = p_employee_id;
    END IF;

    RETURN COALESCE(v_base_hours, 8.0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to trigger capacity recalculation
CREATE OR REPLACE FUNCTION trigger_capacity_recalculation(
    p_employee_ids UUID[],
    p_start_date DATE,
    p_end_date DATE,
    p_trigger_type VARCHAR(50),
    p_trigger_id UUID DEFAULT NULL,
    p_initiated_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_start_time TIMESTAMP;
    v_records_updated INTEGER := 0;
BEGIN
    v_start_time := CLOCK_TIMESTAMP();

    -- Create log entry
    INSERT INTO capacity_recalculation_log (
        trigger_type, trigger_id, affected_employee_ids,
        date_range_start, date_range_end, initiated_by
    ) VALUES (
        p_trigger_type, p_trigger_id, p_employee_ids,
        p_start_date, p_end_date, p_initiated_by
    ) RETURNING id INTO v_log_id;

    -- Recalculate capacity snapshots for affected employees and dates
    -- This would typically trigger a background job, but we'll do inline for now
    FOR i IN 1..array_length(p_employee_ids, 1) LOOP
        -- Upsert capacity snapshots
        INSERT INTO employee_capacity_snapshots (
            employee_id, snapshot_date, available_hours, allocated_hours
        )
        SELECT
            p_employee_ids[i],
            d.date,
            calculate_available_hours(p_employee_ids[i], d.date),
            COALESCE(
                (SELECT SUM(allocated_hours / (end_date - start_date + 1))
                 FROM resource_allocations
                 WHERE employee_id = p_employee_ids[i]
                 AND is_active = true
                 AND allocation_status IN ('approved', 'auto_approved')
                 AND d.date BETWEEN start_date AND end_date), 0
            )
        FROM generate_series(p_start_date, p_end_date, '1 day'::interval) d(date)
        ON CONFLICT (employee_id, snapshot_date)
        DO UPDATE SET
            available_hours = EXCLUDED.available_hours,
            allocated_hours = EXCLUDED.allocated_hours,
            last_updated = CURRENT_TIMESTAMP;

        v_records_updated := v_records_updated + (p_end_date - p_start_date + 1);
    END LOOP;

    -- Update log entry
    UPDATE capacity_recalculation_log SET
        completed_at = CLOCK_TIMESTAMP(),
        records_updated = v_records_updated,
        success = true,
        execution_time_ms = EXTRACT(MILLISECONDS FROM (CLOCK_TIMESTAMP() - v_start_time))
    WHERE id = v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CREATE TRIGGERS
-- ============================================

-- Update trigger for updated_at columns
CREATE TRIGGER trg_availability_patterns_updated_at
    BEFORE UPDATE ON availability_patterns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_holiday_calendar_updated_at
    BEFORE UPDATE ON holiday_calendar
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_availability_exceptions_updated_at
    BEFORE UPDATE ON availability_exceptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED INITIAL DATA (Optional, for production)
-- ============================================

-- Insert common US holidays for 2024
INSERT INTO holiday_calendar (holiday_date, holiday_name, holiday_type, country, is_company_wide)
VALUES
    ('2024-01-01', 'New Year''s Day', 'public', 'US', true),
    ('2024-01-15', 'Martin Luther King Jr. Day', 'public', 'US', true),
    ('2024-02-19', 'Presidents Day', 'public', 'US', true),
    ('2024-05-27', 'Memorial Day', 'public', 'US', true),
    ('2024-07-04', 'Independence Day', 'public', 'US', true),
    ('2024-09-02', 'Labor Day', 'public', 'US', true),
    ('2024-11-28', 'Thanksgiving Day', 'public', 'US', true),
    ('2024-11-29', 'Day after Thanksgiving', 'company', 'US', true),
    ('2024-12-25', 'Christmas Day', 'public', 'US', true),
    ('2024-12-31', 'New Year''s Eve', 'company', 'US', true)
ON CONFLICT (holiday_date, holiday_name) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE availability_patterns IS
'Stores recurring availability patterns for employees. Supports weekly, biweekly, monthly, and custom patterns with flexible JSONB configuration.';

COMMENT ON TABLE holiday_calendar IS
'Company and public holiday calendar. Supports regional holidays and department-specific holidays.';

COMMENT ON TABLE availability_exceptions IS
'One-off availability changes such as PTO, sick leave, or training. Requires approval workflow.';

COMMENT ON COLUMN availability_patterns.configuration IS
'JSONB structure varies by pattern_type. Weekly: days of week with hours. Custom: array of specific dates.';

-- ============================================
-- ROLLBACK SCRIPT (DOWN MIGRATION)
-- ============================================

/*
-- To rollback this migration, run:

-- Drop triggers
DROP TRIGGER IF EXISTS trg_availability_patterns_updated_at ON availability_patterns;
DROP TRIGGER IF EXISTS trg_holiday_calendar_updated_at ON holiday_calendar;
DROP TRIGGER IF EXISTS trg_availability_exceptions_updated_at ON availability_exceptions;

-- Drop functions
DROP FUNCTION IF EXISTS get_effective_availability_pattern(UUID, DATE);
DROP FUNCTION IF EXISTS calculate_available_hours(UUID, DATE);
DROP FUNCTION IF EXISTS trigger_capacity_recalculation(UUID[], DATE, DATE, VARCHAR, UUID, UUID);

-- Drop indexes
DROP INDEX IF EXISTS idx_availability_patterns_employee_active;
DROP INDEX IF EXISTS idx_availability_patterns_date_range;
DROP INDEX IF EXISTS idx_availability_patterns_priority;
DROP INDEX IF EXISTS idx_availability_patterns_config;
DROP INDEX IF EXISTS idx_holiday_calendar_date;
DROP INDEX IF EXISTS idx_holiday_calendar_year_month;
DROP INDEX IF EXISTS idx_holiday_calendar_company_wide;
DROP INDEX IF EXISTS idx_holiday_calendar_departments;
DROP INDEX IF EXISTS idx_availability_exceptions_employee_date;
DROP INDEX IF EXISTS idx_availability_exceptions_date_range;
DROP INDEX IF EXISTS idx_availability_exceptions_pending_approval;
DROP INDEX IF EXISTS idx_availability_exceptions_type;
DROP INDEX IF EXISTS idx_capacity_recalc_log_date;
DROP INDEX IF EXISTS idx_capacity_recalc_log_trigger;

-- Drop tables
DROP TABLE IF EXISTS capacity_recalculation_log;
DROP TABLE IF EXISTS availability_exceptions;
DROP TABLE IF EXISTS holiday_calendar;
DROP TABLE IF EXISTS availability_patterns;

-- Drop enum types
DROP TYPE IF EXISTS availability_exception_type;
DROP TYPE IF EXISTS availability_pattern_type;
*/
-- Advanced Availability Management Tables (Phase 1 - Week 2)
-- Following plan.md lines 61-70 specifications

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS capacity_recalculation_log CASCADE;
DROP TABLE IF EXISTS availability_exceptions CASCADE;
DROP TABLE IF EXISTS holiday_calendar CASCADE;
DROP TABLE IF EXISTS availability_patterns CASCADE;

-- Availability Patterns Table
-- Stores recurring availability patterns with flexible JSONB configuration
CREATE TABLE availability_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    pattern_name VARCHAR(255) NOT NULL,
    pattern_type VARCHAR(50) NOT NULL CHECK (pattern_type IN ('standard', 'flexible', 'part_time', 'custom')),

    -- JSONB configuration for flexible pattern definition
    pattern_config JSONB NOT NULL DEFAULT '{}',
    /* Example pattern_config:
    {
        "monday": { "available": true, "hours": 8, "start": "09:00", "end": "17:00" },
        "tuesday": { "available": true, "hours": 8, "start": "09:00", "end": "17:00" },
        "wednesday": { "available": true, "hours": 8, "start": "09:00", "end": "17:00" },
        "thursday": { "available": true, "hours": 8, "start": "09:00", "end": "17:00" },
        "friday": { "available": true, "hours": 6, "start": "09:00", "end": "15:00" },
        "saturday": { "available": false, "hours": 0 },
        "sunday": { "available": false, "hours": 0 },
        "weekly_hours": 38,
        "timezone": "America/New_York",
        "lunch_break": { "duration": 60, "start": "12:00" }
    }
    */

    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_until DATE,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0, -- Higher priority patterns override lower ones

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES employees(id),
    updated_by UUID REFERENCES employees(id)
);

-- Create GIN index for JSONB queries
CREATE INDEX idx_availability_patterns_config ON availability_patterns USING GIN (pattern_config);
CREATE INDEX idx_availability_patterns_employee ON availability_patterns(employee_id);
CREATE INDEX idx_availability_patterns_active ON availability_patterns(is_active) WHERE is_active = true;
CREATE INDEX idx_availability_patterns_dates ON availability_patterns(effective_from, effective_until);

-- Availability Exceptions Table
-- Stores one-time exceptions to regular patterns (vacation, sick days, etc.)
CREATE TABLE availability_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    exception_type VARCHAR(50) NOT NULL CHECK (exception_type IN (
        'vacation', 'sick', 'personal', 'training', 'conference',
        'public_holiday', 'company_holiday', 'partial_day', 'other'
    )),
    available_hours DECIMAL(4,2) DEFAULT 0,

    -- Time details for partial day exceptions
    start_time TIME,
    end_time TIME,

    reason TEXT,
    is_approved BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_employee_exception_date UNIQUE(employee_id, exception_date)
);

CREATE INDEX idx_availability_exceptions_employee ON availability_exceptions(employee_id);
CREATE INDEX idx_availability_exceptions_date ON availability_exceptions(exception_date);
CREATE INDEX idx_availability_exceptions_type ON availability_exceptions(exception_type);
CREATE INDEX idx_availability_exceptions_approved ON availability_exceptions(is_approved);

-- Holiday Calendar Table
-- Stores company-wide and regional holidays
CREATE TABLE holiday_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    holiday_date DATE NOT NULL,
    holiday_name VARCHAR(255) NOT NULL,
    holiday_type VARCHAR(50) CHECK (holiday_type IN ('company', 'national', 'regional', 'optional')),
    country_code VARCHAR(2),
    region_code VARCHAR(50),
    is_working_day BOOLEAN DEFAULT false,
    working_hours DECIMAL(4,2) DEFAULT 0,

    -- Department-specific application
    applies_to_departments UUID[] DEFAULT ARRAY[]::UUID[],

    -- Recurrence pattern for annual holidays
    is_recurring BOOLEAN DEFAULT false,
    recurrence_month INTEGER CHECK (recurrence_month BETWEEN 1 AND 12),
    recurrence_day INTEGER CHECK (recurrence_day BETWEEN 1 AND 31),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_holiday_date_name UNIQUE(holiday_date, holiday_name)
);

CREATE INDEX idx_holiday_calendar_date ON holiday_calendar(holiday_date);
CREATE INDEX idx_holiday_calendar_type ON holiday_calendar(holiday_type);
CREATE INDEX idx_holiday_calendar_recurring ON holiday_calendar(is_recurring);

-- Capacity Recalculation Log Table
-- Tracks when capacity is recalculated for audit and debugging
CREATE TABLE capacity_recalculation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN (
        'manual', 'scheduled', 'pattern_change', 'exception_added',
        'holiday_added', 'bulk_update', 'system'
    )),
    affected_employees UUID[],
    affected_date_range DATERANGE,

    -- Performance metrics
    records_processed INTEGER,
    execution_time_ms INTEGER,

    -- Change details
    changes_applied JSONB DEFAULT '{}',
    /* Example changes_applied:
    {
        "patterns_updated": 5,
        "exceptions_applied": 12,
        "holidays_applied": 2,
        "capacity_records_created": 150,
        "capacity_records_updated": 75
    }
    */

    status VARCHAR(20) CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,

    -- User who triggered the recalculation
    triggered_by UUID REFERENCES employees(id),

    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_capacity_recalc_log_status ON capacity_recalculation_log(status);
CREATE INDEX idx_capacity_recalc_log_trigger ON capacity_recalculation_log(trigger_type);
CREATE INDEX idx_capacity_recalc_log_dates ON capacity_recalculation_log USING GIST (affected_date_range);

-- Function to calculate daily capacity for an employee (enhanced version)
-- Using a different name to avoid conflicts with existing function
CREATE OR REPLACE FUNCTION calculate_daily_capacity_enhanced(
    p_employee_id UUID,
    p_date DATE
) RETURNS TABLE(
    employee_id UUID,
    date DATE,
    base_hours DECIMAL,
    available_hours DECIMAL,
    is_working_day BOOLEAN,
    applied_pattern VARCHAR,
    applied_exception VARCHAR
) AS $$
DECLARE
    v_base_hours DECIMAL := 8;
    v_available_hours DECIMAL := 8;
    v_is_working_day BOOLEAN := true;
    v_applied_pattern VARCHAR;
    v_applied_exception VARCHAR;
    v_day_of_week INTEGER;
    v_pattern RECORD;
    v_exception RECORD;
    v_holiday RECORD;
BEGIN
    -- Get day of week (0 = Sunday, 6 = Saturday)
    v_day_of_week := EXTRACT(DOW FROM p_date);

    -- Check for holidays first
    SELECT * INTO v_holiday
    FROM holiday_calendar
    WHERE holiday_date = p_date
    LIMIT 1;

    IF v_holiday IS NOT NULL THEN
        v_is_working_day := v_holiday.is_working_day;
        v_available_hours := v_holiday.working_hours;
        v_applied_exception := 'holiday: ' || v_holiday.holiday_name;

        IF NOT v_is_working_day THEN
            -- Holiday, no work
            RETURN QUERY SELECT
                p_employee_id,
                p_date,
                v_base_hours,
                0::DECIMAL,
                false,
                v_applied_pattern,
                v_applied_exception;
            RETURN;
        END IF;
    END IF;

    -- Get active availability pattern for the employee
    SELECT * INTO v_pattern
    FROM availability_patterns
    WHERE employee_id = p_employee_id
        AND is_active = true
        AND p_date >= effective_from
        AND (effective_until IS NULL OR p_date <= effective_until)
    ORDER BY priority DESC, created_at DESC
    LIMIT 1;

    IF v_pattern IS NOT NULL THEN
        v_applied_pattern := v_pattern.pattern_name;

        -- Extract hours from pattern_config based on day of week
        CASE v_day_of_week
            WHEN 0 THEN v_available_hours := COALESCE((v_pattern.pattern_config->'sunday'->>'hours')::DECIMAL, 0);
            WHEN 1 THEN v_available_hours := COALESCE((v_pattern.pattern_config->'monday'->>'hours')::DECIMAL, 8);
            WHEN 2 THEN v_available_hours := COALESCE((v_pattern.pattern_config->'tuesday'->>'hours')::DECIMAL, 8);
            WHEN 3 THEN v_available_hours := COALESCE((v_pattern.pattern_config->'wednesday'->>'hours')::DECIMAL, 8);
            WHEN 4 THEN v_available_hours := COALESCE((v_pattern.pattern_config->'thursday'->>'hours')::DECIMAL, 8);
            WHEN 5 THEN v_available_hours := COALESCE((v_pattern.pattern_config->'friday'->>'hours')::DECIMAL, 8);
            WHEN 6 THEN v_available_hours := COALESCE((v_pattern.pattern_config->'saturday'->>'hours')::DECIMAL, 0);
        END CASE;

        v_base_hours := v_available_hours;
    END IF;

    -- Check for exceptions (overrides patterns)
    SELECT * INTO v_exception
    FROM availability_exceptions
    WHERE employee_id = p_employee_id
        AND exception_date = p_date
        AND is_approved = true;

    IF v_exception IS NOT NULL THEN
        v_available_hours := v_exception.available_hours;
        v_applied_exception := v_exception.exception_type || ': ' || COALESCE(v_exception.reason, '');

        IF v_exception.exception_type IN ('vacation', 'sick', 'personal') THEN
            v_is_working_day := v_exception.available_hours > 0;
        END IF;
    END IF;

    RETURN QUERY SELECT
        p_employee_id,
        p_date,
        v_base_hours,
        v_available_hours,
        v_is_working_day,
        v_applied_pattern,
        v_applied_exception;
END;
$$ LANGUAGE plpgsql;

-- Function to recalculate capacity for a date range
-- Updating to use the enhanced capacity calculation
CREATE OR REPLACE FUNCTION recalculate_capacity_range_enhanced(
    p_employee_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT CURRENT_DATE,
    p_end_date DATE DEFAULT CURRENT_DATE + INTERVAL '90 days'
) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_date DATE;
    v_capacity RECORD;
    v_employee RECORD;
BEGIN
    -- If no employee specified, recalculate for all active employees
    IF p_employee_id IS NULL THEN
        FOR v_employee IN
            SELECT id FROM employees WHERE is_active = true
        LOOP
            FOR v_date IN
                SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date
            LOOP
                SELECT * INTO v_capacity
                FROM calculate_daily_capacity(v_employee.id, v_date);

                -- Update or insert capacity record
                INSERT INTO daily_capacity_cache (
                    employee_id, date, available_hours, is_working_day
                ) VALUES (
                    v_capacity.employee_id,
                    v_capacity.date,
                    v_capacity.available_hours,
                    v_capacity.is_working_day
                )
                ON CONFLICT (employee_id, date) DO UPDATE SET
                    available_hours = EXCLUDED.available_hours,
                    is_working_day = EXCLUDED.is_working_day,
                    updated_at = CURRENT_TIMESTAMP;

                v_count := v_count + 1;
            END LOOP;
        END LOOP;
    ELSE
        -- Recalculate for specific employee
        FOR v_date IN
            SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date
        LOOP
            SELECT * INTO v_capacity
            FROM calculate_daily_capacity(p_employee_id, v_date);

            -- Update or insert capacity record
            INSERT INTO daily_capacity_cache (
                employee_id, date, available_hours, is_working_day
            ) VALUES (
                v_capacity.employee_id,
                v_capacity.date,
                v_capacity.available_hours,
                v_capacity.is_working_day
            )
            ON CONFLICT (employee_id, date) DO UPDATE SET
                available_hours = EXCLUDED.available_hours,
                is_working_day = EXCLUDED.is_working_day,
                updated_at = CURRENT_TIMESTAMP;

            v_count := v_count + 1;
        END LOOP;
    END IF;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Daily capacity cache table for performance
CREATE TABLE IF NOT EXISTS daily_capacity_cache (
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    available_hours DECIMAL(4,2) NOT NULL DEFAULT 8,
    is_working_day BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (employee_id, date)
);

CREATE INDEX idx_daily_capacity_cache_date ON daily_capacity_cache(date);
CREATE INDEX idx_daily_capacity_cache_employee ON daily_capacity_cache(employee_id);

-- Triggers to automatically recalculate capacity when patterns or exceptions change
CREATE OR REPLACE FUNCTION trigger_capacity_recalculation()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the recalculation
    INSERT INTO capacity_recalculation_log (
        trigger_type,
        affected_employees,
        affected_date_range,
        status
    ) VALUES (
        CASE
            WHEN TG_TABLE_NAME = 'availability_patterns' THEN 'pattern_change'
            WHEN TG_TABLE_NAME = 'availability_exceptions' THEN 'exception_added'
            WHEN TG_TABLE_NAME = 'holiday_calendar' THEN 'holiday_added'
            ELSE 'system'
        END,
        CASE
            WHEN TG_TABLE_NAME IN ('availability_patterns', 'availability_exceptions') THEN
                ARRAY[COALESCE(NEW.employee_id, OLD.employee_id)]
            ELSE NULL
        END,
        CASE
            WHEN TG_TABLE_NAME = 'availability_exceptions' THEN
                daterange(NEW.exception_date, NEW.exception_date, '[]')
            WHEN TG_TABLE_NAME = 'holiday_calendar' THEN
                daterange(NEW.holiday_date, NEW.holiday_date, '[]')
            ELSE
                daterange(CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days', '[]')
        END,
        'pending'
    );

    -- Note: Actual recalculation should be done asynchronously by a background job
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER availability_pattern_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON availability_patterns
FOR EACH ROW EXECUTE FUNCTION trigger_capacity_recalculation();

CREATE TRIGGER availability_exception_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON availability_exceptions
FOR EACH ROW EXECUTE FUNCTION trigger_capacity_recalculation();

CREATE TRIGGER holiday_calendar_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON holiday_calendar
FOR EACH ROW EXECUTE FUNCTION trigger_capacity_recalculation();

-- Insert default availability pattern for all existing employees
INSERT INTO availability_patterns (employee_id, pattern_name, pattern_type, pattern_config)
SELECT
    id,
    'Standard Full-Time',
    'standard',
    jsonb_build_object(
        'monday', jsonb_build_object('available', true, 'hours', 8, 'start', '09:00', 'end', '17:00'),
        'tuesday', jsonb_build_object('available', true, 'hours', 8, 'start', '09:00', 'end', '17:00'),
        'wednesday', jsonb_build_object('available', true, 'hours', 8, 'start', '09:00', 'end', '17:00'),
        'thursday', jsonb_build_object('available', true, 'hours', 8, 'start', '09:00', 'end', '17:00'),
        'friday', jsonb_build_object('available', true, 'hours', 8, 'start', '09:00', 'end', '17:00'),
        'saturday', jsonb_build_object('available', false, 'hours', 0),
        'sunday', jsonb_build_object('available', false, 'hours', 0),
        'weekly_hours', 40,
        'timezone', 'UTC'
    )
FROM employees
WHERE is_active = true
ON CONFLICT DO NOTHING;

-- Insert common holidays for 2024-2025
INSERT INTO holiday_calendar (holiday_date, holiday_name, holiday_type, country_code, is_recurring) VALUES
    ('2024-01-01', 'New Year''s Day', 'national', 'US', true),
    ('2024-07-04', 'Independence Day', 'national', 'US', true),
    ('2024-11-28', 'Thanksgiving', 'national', 'US', true),
    ('2024-12-25', 'Christmas', 'national', 'US', true),
    ('2025-01-01', 'New Year''s Day', 'national', 'US', true),
    ('2025-07-04', 'Independence Day', 'national', 'US', true),
    ('2025-11-27', 'Thanksgiving', 'national', 'US', true),
    ('2025-12-25', 'Christmas', 'national', 'US', true)
ON CONFLICT DO NOTHING;

-- Create initial capacity cache for next 90 days
SELECT recalculate_capacity_range(NULL, CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days');

-- Add comments for documentation
COMMENT ON TABLE availability_patterns IS 'Stores recurring availability patterns for employees with flexible configuration';
COMMENT ON TABLE availability_exceptions IS 'Stores one-time exceptions to regular availability patterns';
COMMENT ON TABLE holiday_calendar IS 'Stores company-wide and regional holidays';
COMMENT ON TABLE capacity_recalculation_log IS 'Audit log for capacity recalculation operations';
COMMENT ON FUNCTION calculate_daily_capacity IS 'Calculates available capacity for an employee on a specific date';
COMMENT ON FUNCTION recalculate_capacity_range IS 'Recalculates capacity for a date range for one or all employees';
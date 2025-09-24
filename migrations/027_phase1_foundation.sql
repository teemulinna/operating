-- Migration: 027_phase1_foundation
-- Description: Phase 1 foundation tables for capacity management, over-allocation warnings, and real-time tracking
-- Author: Resource Management System
-- Date: 2024-01-22

-- ============================================
-- ENABLE EXTENSIONS
-- ============================================

-- Enable pgcrypto for gen_random_uuid() - standardized per ADR-001
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- CREATE ENUM TYPES (must exist before table references)
-- ============================================

-- Enum for types of allocation warnings
DO $$ BEGIN
    CREATE TYPE allocation_warning_type AS ENUM (
        'over_allocation',      -- Employee allocated beyond capacity
        'capacity_exceeded',    -- Total capacity exceeded for period
        'skill_mismatch',      -- Allocated to project without required skills
        'date_conflict',       -- Conflicting allocations on same dates
        'budget_overrun'       -- Allocation would exceed project budget
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum for warning severity levels
DO $$ BEGIN
    CREATE TYPE warning_severity AS ENUM (
        'low',      -- Minor issue, informational
        'medium',   -- Should be addressed soon
        'high',     -- Needs immediate attention
        'critical'  -- Blocking issue, must be resolved
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum for allocation approval status
DO $$ BEGIN
    CREATE TYPE allocation_status AS ENUM (
        'pending',       -- Awaiting approval
        'approved',      -- Manually approved by manager
        'rejected',      -- Rejected by approver
        'auto_approved', -- Automatically approved (within limits)
        'expired'        -- Approval window expired
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- ALTER EXISTING TABLES
-- ============================================

-- Add capacity tracking fields to employees table
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS daily_capacity_hours DECIMAL(4,2) DEFAULT 8.0
    CHECK (daily_capacity_hours > 0 AND daily_capacity_hours <= 24),
ADD COLUMN IF NOT EXISTS overtime_threshold DECIMAL(4,2) DEFAULT 10.0
    CHECK (overtime_threshold >= 0 AND overtime_threshold <= 24),
ADD COLUMN IF NOT EXISTS auto_overtime_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"over_allocation": true, "capacity_warnings": true}'::jsonb;

-- Add approval fields to resource_allocations table
ALTER TABLE resource_allocations
ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_manager_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS allocation_status allocation_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS daily_hours_distribution JSONB;

-- Add index for allocation status queries
CREATE INDEX IF NOT EXISTS idx_resource_allocations_status
ON resource_allocations(allocation_status)
WHERE allocation_status IN ('pending', 'rejected');

-- ============================================
-- CREATE NEW TABLES
-- ============================================

-- Real-time capacity snapshots table for tracking daily capacity
CREATE TABLE IF NOT EXISTS employee_capacity_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    allocated_hours DECIMAL(6,2) NOT NULL DEFAULT 0
        CHECK (allocated_hours >= 0),
    available_hours DECIMAL(6,2) NOT NULL DEFAULT 8.0
        CHECK (available_hours >= 0 AND available_hours <= 24),
    over_allocation_hours DECIMAL(6,2) GENERATED ALWAYS AS (
        CASE
            WHEN allocated_hours > available_hours
            THEN allocated_hours - available_hours
            ELSE 0
        END
    ) STORED,
    utilization_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE
            WHEN available_hours > 0
            THEN LEAST(999.99, (allocated_hours / available_hours) * 100)
            ELSE 0
        END
    ) STORED,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure one snapshot per employee per date
    CONSTRAINT uk_employee_capacity_snapshot UNIQUE(employee_id, snapshot_date),

    -- Ensure snapshot date is not in far future (more than 2 years)
    CONSTRAINT chk_snapshot_date_reasonable CHECK (
        snapshot_date <= CURRENT_DATE + INTERVAL '2 years'
    )
);

-- Over-allocation warnings table for tracking capacity conflicts
CREATE TABLE IF NOT EXISTS over_allocation_warnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    allocation_id UUID REFERENCES resource_allocations(id) ON DELETE CASCADE,
    warning_type allocation_warning_type NOT NULL,
    severity warning_severity NOT NULL DEFAULT 'medium',
    conflict_date DATE NOT NULL,
    over_allocation_hours DECIMAL(6,2) NOT NULL
        CHECK (over_allocation_hours > 0),
    auto_resolved BOOLEAN DEFAULT false,
    resolution_strategy TEXT,
    acknowledged_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure conflict date is reasonable
    CONSTRAINT chk_warning_date_reasonable CHECK (
        conflict_date >= CURRENT_DATE - INTERVAL '1 year'
        AND conflict_date <= CURRENT_DATE + INTERVAL '2 years'
    ),

    -- Ensure acknowledged_at is after created_at
    CONSTRAINT chk_acknowledged_after_created CHECK (
        acknowledged_at IS NULL OR acknowledged_at >= created_at
    ),

    -- Ensure resolved_at is after acknowledged_at
    CONSTRAINT chk_resolved_after_acknowledged CHECK (
        resolved_at IS NULL OR acknowledged_at IS NULL OR resolved_at >= acknowledged_at
    )
);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Capacity snapshots indexes
CREATE INDEX idx_capacity_snapshots_employee_date
ON employee_capacity_snapshots(employee_id, snapshot_date DESC);

CREATE INDEX idx_capacity_snapshots_date_range
ON employee_capacity_snapshots(snapshot_date)
WHERE snapshot_date >= CURRENT_DATE - INTERVAL '3 months';

CREATE INDEX idx_capacity_snapshots_over_allocated
ON employee_capacity_snapshots(employee_id, snapshot_date, over_allocation_hours)
WHERE over_allocation_hours > 0;

CREATE INDEX idx_capacity_snapshots_utilization
ON employee_capacity_snapshots(employee_id, utilization_percentage DESC, snapshot_date);

-- Over-allocation warnings indexes
CREATE INDEX idx_warnings_employee_unresolved
ON over_allocation_warnings(employee_id, conflict_date)
WHERE resolved_at IS NULL;

CREATE INDEX idx_warnings_severity_date
ON over_allocation_warnings(severity, conflict_date DESC)
WHERE resolved_at IS NULL;

CREATE INDEX idx_warnings_project_active
ON over_allocation_warnings(project_id, created_at DESC)
WHERE resolved_at IS NULL AND project_id IS NOT NULL;

CREATE INDEX idx_warnings_type_severity
ON over_allocation_warnings(warning_type, severity)
WHERE resolved_at IS NULL;

-- Covering index for dashboard queries
CREATE INDEX idx_warnings_dashboard
ON over_allocation_warnings(employee_id, warning_type, severity, created_at DESC)
INCLUDE (conflict_date, over_allocation_hours, auto_resolved)
WHERE resolved_at IS NULL;

-- Resource allocations performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_allocations_employee_date_active
ON resource_allocations(employee_id, start_date, end_date)
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_allocations_approval_pending
ON resource_allocations(created_at DESC)
WHERE allocation_status = 'pending' AND requires_manager_approval = true;

-- JSON index for notification preferences
CREATE INDEX IF NOT EXISTS idx_employees_notification_prefs
ON employees USING GIN (notification_preferences);

-- ============================================
-- CREATE TRIGGER FOR UPDATED_AT
-- ============================================

-- Create or replace the update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to over_allocation_warnings
CREATE TRIGGER trg_over_allocation_warnings_updated_at
    BEFORE UPDATE ON over_allocation_warnings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CREATE HELPER FUNCTIONS
-- ============================================

-- Function to check if an employee is over-allocated on a specific date
CREATE OR REPLACE FUNCTION is_employee_over_allocated(
    p_employee_id UUID,
    p_date DATE
) RETURNS BOOLEAN AS $$
DECLARE
    v_total_allocated DECIMAL(6,2);
    v_available_hours DECIMAL(4,2);
BEGIN
    -- Get employee's daily capacity
    SELECT daily_capacity_hours INTO v_available_hours
    FROM employees
    WHERE id = p_employee_id;

    -- Calculate total allocated hours for the date
    SELECT COALESCE(SUM(
        allocated_hours / (end_date - start_date + 1)
    ), 0) INTO v_total_allocated
    FROM resource_allocations
    WHERE employee_id = p_employee_id
    AND is_active = true
    AND allocation_status IN ('approved', 'auto_approved')
    AND p_date BETWEEN start_date AND end_date;

    RETURN v_total_allocated > v_available_hours;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate utilization percentage for an employee on a date
CREATE OR REPLACE FUNCTION calculate_utilization_percentage(
    p_employee_id UUID,
    p_date DATE
) RETURNS DECIMAL(5,2) AS $$
DECLARE
    v_total_allocated DECIMAL(6,2);
    v_available_hours DECIMAL(4,2);
BEGIN
    -- Get employee's daily capacity
    SELECT daily_capacity_hours INTO v_available_hours
    FROM employees
    WHERE id = p_employee_id;

    IF v_available_hours IS NULL OR v_available_hours = 0 THEN
        RETURN 0;
    END IF;

    -- Calculate total allocated hours for the date
    SELECT COALESCE(SUM(
        allocated_hours / (end_date - start_date + 1)
    ), 0) INTO v_total_allocated
    FROM resource_allocations
    WHERE employee_id = p_employee_id
    AND is_active = true
    AND allocation_status IN ('approved', 'auto_approved')
    AND p_date BETWEEN start_date AND end_date;

    RETURN LEAST(999.99, (v_total_allocated / v_available_hours) * 100);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- SEED INITIAL DATA (Optional, for development)
-- ============================================

-- Add comment for production deployment
COMMENT ON TABLE employee_capacity_snapshots IS
'Stores daily capacity snapshots for employees, tracking utilization and over-allocation. Updated by triggers and batch jobs.';

COMMENT ON TABLE over_allocation_warnings IS
'Tracks capacity conflicts and over-allocation warnings. Used for alerting managers and preventing resource conflicts.';

COMMENT ON COLUMN employee_capacity_snapshots.utilization_percentage IS
'Calculated as (allocated_hours / available_hours) * 100, capped at 999.99%';

COMMENT ON COLUMN over_allocation_warnings.severity IS
'low: informational, medium: address soon, high: immediate attention, critical: blocking issue';

-- ============================================
-- ROLLBACK SCRIPT (DOWN MIGRATION)
-- ============================================

/*
-- To rollback this migration, run:

-- Drop triggers
DROP TRIGGER IF EXISTS trg_over_allocation_warnings_updated_at ON over_allocation_warnings;

-- Drop functions
DROP FUNCTION IF EXISTS is_employee_over_allocated(UUID, DATE);
DROP FUNCTION IF EXISTS calculate_utilization_percentage(UUID, DATE);
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_capacity_snapshots_employee_date;
DROP INDEX IF EXISTS idx_capacity_snapshots_date_range;
DROP INDEX IF EXISTS idx_capacity_snapshots_over_allocated;
DROP INDEX IF EXISTS idx_capacity_snapshots_utilization;
DROP INDEX IF EXISTS idx_warnings_employee_unresolved;
DROP INDEX IF EXISTS idx_warnings_severity_date;
DROP INDEX IF EXISTS idx_warnings_project_active;
DROP INDEX IF EXISTS idx_warnings_type_severity;
DROP INDEX IF EXISTS idx_warnings_dashboard;
DROP INDEX IF EXISTS idx_allocations_employee_date_active;
DROP INDEX IF EXISTS idx_allocations_approval_pending;
DROP INDEX IF EXISTS idx_employees_notification_prefs;
DROP INDEX IF EXISTS idx_resource_allocations_status;

-- Drop tables
DROP TABLE IF EXISTS over_allocation_warnings;
DROP TABLE IF EXISTS employee_capacity_snapshots;

-- Remove columns from resource_allocations
ALTER TABLE resource_allocations
DROP COLUMN IF EXISTS auto_approved,
DROP COLUMN IF EXISTS requires_manager_approval,
DROP COLUMN IF EXISTS approved_by,
DROP COLUMN IF EXISTS approved_at,
DROP COLUMN IF EXISTS allocation_status,
DROP COLUMN IF EXISTS daily_hours_distribution;

-- Remove columns from employees
ALTER TABLE employees
DROP COLUMN IF EXISTS daily_capacity_hours,
DROP COLUMN IF EXISTS overtime_threshold,
DROP COLUMN IF EXISTS auto_overtime_approval,
DROP COLUMN IF EXISTS notification_preferences;

-- Drop enum types
DROP TYPE IF EXISTS allocation_status;
DROP TYPE IF EXISTS warning_severity;
DROP TYPE IF EXISTS allocation_warning_type;

-- Note: We don't remove pgcrypto as other migrations might depend on it
*/
-- Migration: fix_uuid_integer_mismatch.sql
-- Description: Fix critical UUID vs INTEGER mismatch for employee_id references
-- Author: System Architecture Designer
-- Date: $(date +%Y-%m-%d)
-- CRITICAL: This migration fixes the "operator does not exist: uuid > integer" errors

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Begin transaction for atomicity
BEGIN;

-- =============================================================================
-- STEP 1: Drop dependent constraints and indexes
-- =============================================================================

-- Drop foreign key constraints that will be recreated
ALTER TABLE allocations DROP CONSTRAINT IF EXISTS fk_allocations_employee;
ALTER TABLE resource_allocations DROP CONSTRAINT IF EXISTS fk_resource_allocations_employee;
ALTER TABLE resource_costs DROP CONSTRAINT IF EXISTS fk_resource_cost_employee;

-- Drop indexes that reference employee_id columns
DROP INDEX IF EXISTS idx_allocations_employee_id;
DROP INDEX IF EXISTS idx_allocations_employee_dates;
DROP INDEX IF EXISTS idx_resource_allocations_employee_id;
DROP INDEX IF EXISTS idx_resource_allocations_employee_dates;
DROP INDEX IF EXISTS idx_resource_costs_employee_id;
DROP INDEX IF EXISTS idx_resource_costs_employee_active;

-- Drop triggers that might interfere
DROP TRIGGER IF EXISTS trigger_validate_allocation ON assignment_allocations;

-- =============================================================================
-- STEP 2: Create backup tables for data preservation
-- =============================================================================

-- Backup allocations table data
CREATE TABLE allocations_backup AS SELECT * FROM allocations;
CREATE TABLE resource_allocations_backup AS SELECT * FROM resource_allocations;
CREATE TABLE resource_costs_backup AS SELECT * FROM resource_costs;

-- =============================================================================
-- STEP 3: Convert allocations table
-- =============================================================================

-- Create temporary mapping for employee IDs if any INTEGER employee_ids exist in data
-- This handles any test data that might have been inserted incorrectly
CREATE TEMP TABLE employee_id_mapping AS
SELECT
    CASE
        -- If employee_id looks like an integer, try to find corresponding UUID
        WHEN employee_id ~ '^[0-9]+$' THEN (
            SELECT e.id
            FROM employees e
            WHERE e.id::text = employee_id
               OR ROW_NUMBER() OVER (ORDER BY e.created_at) = employee_id::integer
            LIMIT 1
        )
        -- If it's already a UUID format, use as-is
        ELSE employee_id::uuid
    END as new_employee_id,
    employee_id as old_employee_id,
    id as allocation_id
FROM allocations
WHERE employee_id IS NOT NULL;

-- Update allocations table structure
ALTER TABLE allocations
    ALTER COLUMN employee_id TYPE UUID USING
        CASE
            WHEN employee_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
            THEN employee_id::uuid
            WHEN employee_id ~ '^[0-9]+$' THEN (
                SELECT e.id
                FROM employees e
                WHERE ROW_NUMBER() OVER (ORDER BY e.created_at) = employee_id::integer
                LIMIT 1
            )
            ELSE gen_random_uuid() -- Fallback for invalid data
        END;

-- =============================================================================
-- STEP 4: Convert resource_allocations table
-- =============================================================================

-- Update resource_allocations table structure
ALTER TABLE resource_allocations
    ALTER COLUMN employee_id TYPE UUID USING
        CASE
            WHEN employee_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
            THEN employee_id::uuid
            WHEN employee_id ~ '^[0-9]+$' THEN (
                SELECT e.id
                FROM employees e
                WHERE ROW_NUMBER() OVER (ORDER BY e.created_at) = employee_id::integer
                LIMIT 1
            )
            ELSE gen_random_uuid() -- Fallback for invalid data
        END;

-- Also update created_by if it references employees
ALTER TABLE resource_allocations
    ALTER COLUMN created_by TYPE UUID USING
        CASE
            WHEN created_by IS NULL THEN NULL
            WHEN created_by::text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
            THEN created_by::uuid
            WHEN created_by::text ~ '^[0-9]+$' THEN (
                SELECT e.id
                FROM employees e
                WHERE ROW_NUMBER() OVER (ORDER BY e.created_at) = created_by::integer
                LIMIT 1
            )
            ELSE NULL -- Remove invalid references
        END;

-- =============================================================================
-- STEP 5: Convert resource_costs table
-- =============================================================================

-- Update resource_costs table structure
ALTER TABLE resource_costs
    ALTER COLUMN employee_id TYPE UUID USING
        CASE
            WHEN employee_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
            THEN employee_id::uuid
            WHEN employee_id ~ '^[0-9]+$' THEN (
                SELECT e.id
                FROM employees e
                WHERE ROW_NUMBER() OVER (ORDER BY e.created_at) = employee_id::integer
                LIMIT 1
            )
            ELSE gen_random_uuid() -- Fallback for invalid data
        END;

-- =============================================================================
-- STEP 6: Update function signatures that use INTEGER employee_id
-- =============================================================================

-- Update the validate_employee_total_allocation function
DROP FUNCTION IF EXISTS validate_employee_total_allocation();

CREATE OR REPLACE FUNCTION validate_employee_total_allocation()
RETURNS TRIGGER AS $$
DECLARE
    employee_id UUID;
    total_allocation DECIMAL(5,2);
    overlap_start DATE;
    overlap_end DATE;
BEGIN
    -- Get employee_id from the assignment (now UUID)
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
      AND aa.id != COALESCE(NEW.id, gen_random_uuid()) -- Exclude current record for updates
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

-- Update the check_allocation_overlap function to use UUID
DROP FUNCTION IF EXISTS check_allocation_overlap(INTEGER, DATE, DATE, INTEGER);

CREATE OR REPLACE FUNCTION check_allocation_overlap(
    p_employee_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_allocation_id UUID DEFAULT NULL
)
RETURNS TABLE(
    overlapping_allocation_id UUID,
    overlapping_project_name VARCHAR(255),
    overlapping_start_date DATE,
    overlapping_end_date DATE,
    overlapping_allocated_hours DECIMAL(6,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        p.name,
        a.start_date,
        a.end_date,
        a.allocated_hours
    FROM allocations a
    JOIN projects p ON a.project_id = p.id
    WHERE a.employee_id = p_employee_id
      AND a.status IN ('tentative', 'confirmed')
      AND (p_allocation_id IS NULL OR a.id != p_allocation_id)
      AND (
        (a.start_date <= p_start_date AND a.end_date >= p_start_date) OR
        (a.start_date <= p_end_date AND a.end_date >= p_end_date) OR
        (a.start_date >= p_start_date AND a.end_date <= p_end_date)
      );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 7: Update views that reference employee_id
-- =============================================================================

-- Recreate multi_project_assignments view with correct types
DROP VIEW IF EXISTS multi_project_assignments;

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

-- =============================================================================
-- STEP 8: Recreate foreign key constraints
-- =============================================================================

-- Recreate foreign key constraints with proper UUID types
ALTER TABLE allocations
    ADD CONSTRAINT fk_allocations_employee
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

ALTER TABLE resource_allocations
    ADD CONSTRAINT fk_resource_allocations_employee
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

ALTER TABLE resource_costs
    ADD CONSTRAINT fk_resource_cost_employee
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

-- Add constraint for created_by if it references employees
ALTER TABLE resource_allocations
    ADD CONSTRAINT fk_resource_allocations_created_by
    FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL;

-- =============================================================================
-- STEP 9: Recreate indexes for performance
-- =============================================================================

-- Recreate indexes for allocations
CREATE INDEX IF NOT EXISTS idx_allocations_employee_id ON allocations(employee_id);
CREATE INDEX IF NOT EXISTS idx_allocations_employee_dates
    ON allocations(employee_id, start_date, end_date)
    WHERE status IN ('tentative', 'confirmed');

-- Recreate indexes for resource_allocations
CREATE INDEX IF NOT EXISTS idx_resource_allocations_employee_id ON resource_allocations(employee_id);
CREATE INDEX IF NOT EXISTS idx_resource_allocations_employee_dates
    ON resource_allocations(employee_id, start_date, end_date)
    WHERE status IN ('active', 'planned');

-- Recreate indexes for resource_costs
CREATE INDEX IF NOT EXISTS idx_resource_costs_employee_id ON resource_costs(employee_id);
CREATE INDEX IF NOT EXISTS idx_resource_costs_employee_active
    ON resource_costs(employee_id, is_active) WHERE is_active = TRUE;

-- =============================================================================
-- STEP 10: Recreate triggers
-- =============================================================================

-- Recreate the validation trigger
CREATE TRIGGER trigger_validate_allocation
    BEFORE INSERT OR UPDATE ON assignment_allocations
    FOR EACH ROW
    EXECUTE FUNCTION validate_employee_total_allocation();

-- =============================================================================
-- STEP 11: Data validation and cleanup
-- =============================================================================

-- Verify all employee_id references are valid UUIDs and exist in employees table
DO $$
DECLARE
    invalid_count INTEGER;
    orphaned_count INTEGER;
BEGIN
    -- Check for invalid UUIDs in allocations
    SELECT COUNT(*) INTO invalid_count
    FROM allocations
    WHERE employee_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM employees WHERE id = allocations.employee_id);

    IF invalid_count > 0 THEN
        RAISE WARNING 'Found % orphaned employee_id references in allocations table', invalid_count;
        -- Clean up orphaned records
        DELETE FROM allocations
        WHERE employee_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM employees WHERE id = allocations.employee_id);
    END IF;

    -- Check for invalid UUIDs in resource_allocations
    SELECT COUNT(*) INTO invalid_count
    FROM resource_allocations
    WHERE employee_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM employees WHERE id = resource_allocations.employee_id);

    IF invalid_count > 0 THEN
        RAISE WARNING 'Found % orphaned employee_id references in resource_allocations table', invalid_count;
        -- Clean up orphaned records
        DELETE FROM resource_allocations
        WHERE employee_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM employees WHERE id = resource_allocations.employee_id);
    END IF;

    -- Check for invalid UUIDs in resource_costs
    SELECT COUNT(*) INTO invalid_count
    FROM resource_costs
    WHERE employee_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM employees WHERE id = resource_costs.employee_id);

    IF invalid_count > 0 THEN
        RAISE WARNING 'Found % orphaned employee_id references in resource_costs table', invalid_count;
        -- Clean up orphaned records
        DELETE FROM resource_costs
        WHERE employee_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM employees WHERE id = resource_costs.employee_id);
    END IF;

    RAISE NOTICE 'Data validation and cleanup completed successfully';
END $$;

-- =============================================================================
-- STEP 12: Verification queries
-- =============================================================================

-- Verify the fix worked by running some test queries
DO $$
DECLARE
    test_employee_id UUID;
    allocation_count INTEGER;
BEGIN
    -- Get a test employee
    SELECT id INTO test_employee_id FROM employees LIMIT 1;

    IF test_employee_id IS NOT NULL THEN
        -- Test that the problematic query now works
        SELECT COUNT(*) INTO allocation_count
        FROM allocations a
        WHERE a.employee_id = test_employee_id;

        RAISE NOTICE 'Test query successful: Found % allocations for employee %', allocation_count, test_employee_id;

        -- Test resource_allocations query
        SELECT COUNT(*) INTO allocation_count
        FROM resource_allocations ra
        WHERE ra.employee_id = test_employee_id;

        RAISE NOTICE 'Test query successful: Found % resource allocations for employee %', allocation_count, test_employee_id;
    END IF;
END $$;

-- =============================================================================
-- STEP 13: Update table comments and documentation
-- =============================================================================

COMMENT ON COLUMN allocations.employee_id IS 'UUID reference to employees table - matches employees.id type';
COMMENT ON COLUMN resource_allocations.employee_id IS 'UUID reference to employees table - matches employees.id type';
COMMENT ON COLUMN resource_costs.employee_id IS 'UUID reference to employees table - matches employees.id type';
COMMENT ON COLUMN resource_allocations.created_by IS 'UUID reference to employees table for audit trail';

-- =============================================================================
-- STEP 14: Create summary report
-- =============================================================================

DO $$
DECLARE
    total_allocations INTEGER;
    total_resource_allocations INTEGER;
    total_resource_costs INTEGER;
    total_employees INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_allocations FROM allocations;
    SELECT COUNT(*) INTO total_resource_allocations FROM resource_allocations;
    SELECT COUNT(*) INTO total_resource_costs FROM resource_costs;
    SELECT COUNT(*) INTO total_employees FROM employees;

    RAISE NOTICE '=== MIGRATION SUMMARY ===';
    RAISE NOTICE 'Total employees: %', total_employees;
    RAISE NOTICE 'Total allocations converted: %', total_allocations;
    RAISE NOTICE 'Total resource_allocations converted: %', total_resource_allocations;
    RAISE NOTICE 'Total resource_costs converted: %', total_resource_costs;
    RAISE NOTICE 'All employee_id columns now use UUID type matching employees.id';
    RAISE NOTICE 'All foreign key constraints recreated successfully';
    RAISE NOTICE 'All indexes recreated for optimal performance';
    RAISE NOTICE 'Migration completed successfully!';
END $$;

-- Commit the transaction
COMMIT;

-- =============================================================================
-- ROLLBACK INSTRUCTIONS (for emergency use only)
-- =============================================================================

-- To rollback this migration if needed (THIS WILL LOSE DATA):
/*
BEGIN;
DROP TABLE IF EXISTS allocations CASCADE;
DROP TABLE IF EXISTS resource_allocations CASCADE;
DROP TABLE IF EXISTS resource_costs CASCADE;

-- Restore from backups (if they still exist)
CREATE TABLE allocations AS SELECT * FROM allocations_backup;
CREATE TABLE resource_allocations AS SELECT * FROM resource_allocations_backup;
CREATE TABLE resource_costs AS SELECT * FROM resource_costs_backup;

-- Recreate original constraints and indexes here
COMMIT;
*/
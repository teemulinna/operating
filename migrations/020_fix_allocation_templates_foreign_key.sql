-- Migration: Fix allocation_templates foreign key constraint
-- Created: 2025-09-13
-- Purpose: Modify allocation_templates.created_by foreign key to allow employee deletion
-- Issue: Constraint prevents employee deletion when they have created templates
-- Solution: Change constraint from RESTRICT to SET NULL

-- 1. Drop the existing foreign key constraint
ALTER TABLE allocation_templates 
DROP CONSTRAINT IF EXISTS allocation_templates_created_by_fkey;

-- 2. Modify the created_by column to allow NULL values
-- (This is safe since we'll set it to NULL when employee is deleted)
ALTER TABLE allocation_templates 
ALTER COLUMN created_by DROP NOT NULL;

-- 3. Add the new foreign key constraint with ON DELETE SET NULL
ALTER TABLE allocation_templates 
ADD CONSTRAINT allocation_templates_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES employees(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- 4. Update template_customizations table as well (references employees)
ALTER TABLE template_customizations 
DROP CONSTRAINT IF EXISTS template_customizations_customized_by_fkey;

ALTER TABLE template_customizations 
ALTER COLUMN customized_by DROP NOT NULL;

ALTER TABLE template_customizations 
ADD CONSTRAINT template_customizations_customized_by_fkey 
FOREIGN KEY (customized_by) 
REFERENCES employees(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- 5. Update template_usage_history table (references employees)
ALTER TABLE template_usage_history 
DROP CONSTRAINT IF EXISTS template_usage_history_used_by_fkey;

ALTER TABLE template_usage_history 
ALTER COLUMN used_by DROP NOT NULL;

ALTER TABLE template_usage_history 
ADD CONSTRAINT template_usage_history_used_by_fkey 
FOREIGN KEY (used_by) 
REFERENCES employees(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- 6. Create indexes for performance on nullable foreign keys
CREATE INDEX IF NOT EXISTS idx_allocation_templates_created_by_null 
ON allocation_templates(created_by) 
WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_template_customizations_customized_by_null 
ON template_customizations(customized_by) 
WHERE customized_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_template_usage_history_used_by_null 
ON template_usage_history(used_by) 
WHERE used_by IS NOT NULL;

-- 7. Update allocation templates service queries to handle NULL created_by
-- Note: This requires application code changes to handle NULL values gracefully

-- 8. Add a migration verification function
CREATE OR REPLACE FUNCTION verify_allocation_templates_constraint_fix()
RETURNS TABLE (
    constraint_name text,
    table_name text,
    column_name text,
    delete_rule text,
    constraint_fixed boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tc.constraint_name::text,
        tc.table_name::text,
        kcu.column_name::text,
        rc.delete_rule::text,
        (rc.delete_rule = 'SET NULL')::boolean as constraint_fixed
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.referential_constraints rc 
        ON tc.constraint_name = rc.constraint_name
    WHERE tc.table_name IN ('allocation_templates', 'template_customizations', 'template_usage_history')
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name IN ('created_by', 'customized_by', 'used_by')
        AND kcu.referenced_table_name = 'employees';
END;
$$ LANGUAGE plpgsql;

-- Run verification
SELECT * FROM verify_allocation_templates_constraint_fix();

COMMIT;
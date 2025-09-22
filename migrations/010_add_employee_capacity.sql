-- Migration: 010_add_employee_capacity
-- Description: Add weekly capacity field to employees table for individual hour tracking

-- Add weekly_capacity column to employees table
ALTER TABLE employees
ADD COLUMN weekly_capacity DECIMAL(5,2) DEFAULT 40.00
CHECK (weekly_capacity >= 0 AND weekly_capacity <= 168);

-- Add salary column (check if exists is handled by migration runner)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='employees' AND column_name='salary') THEN
        ALTER TABLE employees ADD COLUMN salary DECIMAL(12,2);
    END IF;
END $$;

-- Add comments for clarity
COMMENT ON COLUMN employees.weekly_capacity IS 'Individual employee weekly work capacity in hours';
COMMENT ON COLUMN employees.salary IS 'Employee annual salary';

-- Update existing employees to have 40 hours as default if needed
UPDATE employees
SET weekly_capacity = 40.00
WHERE weekly_capacity IS NULL;
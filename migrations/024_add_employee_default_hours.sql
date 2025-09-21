-- Migration: 024_add_employee_default_hours
-- Description: Add default_hours field to employees table for over-allocation warnings

-- Add default_hours column to employees table
ALTER TABLE employees ADD COLUMN default_hours INTEGER NOT NULL DEFAULT 40;

-- Add constraint to ensure default_hours is positive and reasonable
ALTER TABLE employees ADD CONSTRAINT chk_employees_default_hours_positive 
    CHECK (default_hours > 0 AND default_hours <= 168);

-- Add comment explaining the field
COMMENT ON COLUMN employees.default_hours IS 'Default working hours per week for the employee (used for over-allocation warnings)';

-- Create index for query optimization
CREATE INDEX idx_employees_default_hours ON employees(default_hours);
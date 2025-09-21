-- Migration: 020_fix_missing_constraints
-- Description: Fix missing foreign key constraints and schema integrity issues

-- Ensure uuid extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fix employee_skills foreign key constraints
-- Drop existing constraints if they exist (to recreate with proper settings)
ALTER TABLE employee_skills DROP CONSTRAINT IF EXISTS fk_employee_skills_employee;
ALTER TABLE employee_skills DROP CONSTRAINT IF EXISTS fk_employee_skills_skill;

-- Recreate with proper ON DELETE CASCADE
ALTER TABLE employee_skills 
ADD CONSTRAINT fk_employee_skills_employee 
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

ALTER TABLE employee_skills 
ADD CONSTRAINT fk_employee_skills_skill 
FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE;

-- Ensure departments manager constraint exists
ALTER TABLE departments DROP CONSTRAINT IF EXISTS fk_departments_manager;
ALTER TABLE departments 
ADD CONSTRAINT fk_departments_manager 
FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;

-- Add missing indexes for performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_employee_skills_proficiency_active 
ON employee_skills(proficiency_level) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_employees_active_department 
ON employees(department_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_departments_active 
ON departments(id) WHERE is_active = true;

-- Ensure proper permissions on all tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO CURRENT_USER;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO CURRENT_USER;

-- Clean up any orphaned records that might cause constraint violations
DELETE FROM employee_skills 
WHERE employee_id NOT IN (SELECT id FROM employees);

DELETE FROM employee_skills 
WHERE skill_id NOT IN (SELECT id FROM skills);

UPDATE departments 
SET manager_id = NULL 
WHERE manager_id IS NOT NULL 
AND manager_id NOT IN (SELECT id FROM employees);

-- Analyze tables for better query planning
ANALYZE employees;
ANALYZE employee_skills;
ANALYZE departments;
ANALYZE skills;

-- Create function to validate foreign key integrity
CREATE OR REPLACE FUNCTION validate_foreign_key_integrity()
RETURNS TABLE (
  table_name TEXT,
  constraint_name TEXT,
  is_valid BOOLEAN,
  error_count INTEGER
) AS $$
BEGIN
  -- Check employee_skills -> employees
  RETURN QUERY
  SELECT 
    'employee_skills'::TEXT,
    'fk_employee_skills_employee'::TEXT,
    (SELECT COUNT(*) = 0 FROM employee_skills es LEFT JOIN employees e ON es.employee_id = e.id WHERE e.id IS NULL)::BOOLEAN,
    (SELECT COUNT(*)::INTEGER FROM employee_skills es LEFT JOIN employees e ON es.employee_id = e.id WHERE e.id IS NULL);
  
  -- Check employee_skills -> skills
  RETURN QUERY
  SELECT 
    'employee_skills'::TEXT,
    'fk_employee_skills_skill'::TEXT,
    (SELECT COUNT(*) = 0 FROM employee_skills es LEFT JOIN skills s ON es.skill_id = s.id WHERE s.id IS NULL)::BOOLEAN,
    (SELECT COUNT(*)::INTEGER FROM employee_skills es LEFT JOIN skills s ON es.skill_id = s.id WHERE s.id IS NULL);
  
  -- Check departments -> employees
  RETURN QUERY
  SELECT 
    'departments'::TEXT,
    'fk_departments_manager'::TEXT,
    (SELECT COUNT(*) = 0 FROM departments d LEFT JOIN employees e ON d.manager_id = e.id WHERE d.manager_id IS NOT NULL AND e.id IS NULL)::BOOLEAN,
    (SELECT COUNT(*)::INTEGER FROM departments d LEFT JOIN employees e ON d.manager_id = e.id WHERE d.manager_id IS NOT NULL AND e.id IS NULL);
  
  -- Check employees -> departments
  RETURN QUERY
  SELECT 
    'employees'::TEXT,
    'fk_employees_department'::TEXT,
    (SELECT COUNT(*) = 0 FROM employees e LEFT JOIN departments d ON e.department_id = d.id WHERE d.id IS NULL)::BOOLEAN,
    (SELECT COUNT(*)::INTEGER FROM employees e LEFT JOIN departments d ON e.department_id = d.id WHERE d.id IS NULL);
END;
$$ LANGUAGE plpgsql;

-- Test the integrity validation
SELECT * FROM validate_foreign_key_integrity();
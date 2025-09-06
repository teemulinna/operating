-- Migration: 001_initial_schema.sql
-- Description: Create initial database schema with departments, employees, skills, and capacity tracking
-- Author: Database Architect Agent
-- Date: 2025-09-04

BEGIN;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create audit columns type for reusability
CREATE TYPE audit_fields AS (
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

-- Departments table
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  manager_id UUID, -- Self-referencing to employees table
  budget DECIMAL(12,2) CHECK (budget >= 0),
  location VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  
  -- Constraints
  CONSTRAINT departments_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

-- Employees table
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_number VARCHAR(20) NOT NULL UNIQUE,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  hire_date DATE NOT NULL,
  termination_date DATE,
  
  -- Employment details
  department_id UUID REFERENCES departments(id),
  position_title VARCHAR(100) NOT NULL,
  employment_type VARCHAR(20) NOT NULL CHECK (employment_type IN ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN')),
  salary DECIMAL(10,2) CHECK (salary >= 0),
  hourly_rate DECIMAL(8,2) CHECK (hourly_rate >= 0),
  
  -- Capacity and availability
  weekly_capacity_hours DECIMAL(4,2) DEFAULT 40.00 CHECK (weekly_capacity_hours BETWEEN 0 AND 168),
  is_active BOOLEAN DEFAULT true,
  
  -- Manager relationship
  manager_id UUID REFERENCES employees(id),
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  
  -- Constraints
  CONSTRAINT employees_name_not_empty CHECK (LENGTH(TRIM(first_name)) > 0 AND LENGTH(TRIM(last_name)) > 0),
  CONSTRAINT employees_email_format CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT employees_hire_before_termination CHECK (termination_date IS NULL OR hire_date <= termination_date),
  CONSTRAINT employees_salary_or_hourly CHECK (
    (employment_type IN ('FULL_TIME', 'PART_TIME') AND salary IS NOT NULL AND hourly_rate IS NULL) OR
    (employment_type IN ('CONTRACT', 'INTERN') AND hourly_rate IS NOT NULL AND salary IS NULL)
  )
);

-- Skills table
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  is_technical BOOLEAN DEFAULT true,
  proficiency_levels JSONB DEFAULT '["Beginner", "Intermediate", "Advanced", "Expert"]',
  is_active BOOLEAN DEFAULT true,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  
  -- Constraints
  CONSTRAINT skills_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT skills_category_not_empty CHECK (LENGTH(TRIM(category)) > 0)
);

-- Employee Skills junction table
CREATE TABLE employee_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  proficiency_level VARCHAR(20) NOT NULL DEFAULT 'Beginner',
  years_experience DECIMAL(3,1) DEFAULT 0 CHECK (years_experience >= 0),
  is_certified BOOLEAN DEFAULT false,
  certification_date DATE,
  certification_body VARCHAR(100),
  last_used_date DATE,
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  
  -- Constraints
  UNIQUE(employee_id, skill_id),
  CONSTRAINT employee_skills_proficiency_valid CHECK (
    proficiency_level IN ('Beginner', 'Intermediate', 'Advanced', 'Expert')
  ),
  CONSTRAINT employee_skills_certification_logic CHECK (
    (is_certified = false) OR 
    (is_certified = true AND certification_date IS NOT NULL)
  )
);

-- Capacity History table for tracking workload changes
CREATE TABLE capacity_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  effective_date DATE NOT NULL,
  weekly_capacity_hours DECIMAL(4,2) NOT NULL CHECK (weekly_capacity_hours BETWEEN 0 AND 168),
  reason VARCHAR(200),
  notes TEXT,
  is_temporary BOOLEAN DEFAULT false,
  end_date DATE, -- For temporary capacity changes
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  
  -- Constraints
  CONSTRAINT capacity_history_end_after_start CHECK (end_date IS NULL OR effective_date <= end_date),
  CONSTRAINT capacity_history_temporary_logic CHECK (
    (is_temporary = false AND end_date IS NULL) OR
    (is_temporary = true AND end_date IS NOT NULL)
  )
);

-- Create indexes for performance
CREATE INDEX idx_departments_manager ON departments(manager_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_departments_active ON departments(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_departments_name ON departments(name) WHERE deleted_at IS NULL;

CREATE INDEX idx_employees_department ON employees(department_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_manager ON employees(manager_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_email ON employees(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_employee_number ON employees(employee_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_hire_date ON employees(hire_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_active ON employees(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_name ON employees(first_name, last_name) WHERE deleted_at IS NULL;

CREATE INDEX idx_skills_category ON skills(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_skills_technical ON skills(is_technical) WHERE deleted_at IS NULL;
CREATE INDEX idx_skills_active ON skills(is_active) WHERE deleted_at IS NULL;

CREATE INDEX idx_employee_skills_employee ON employee_skills(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_employee_skills_skill ON employee_skills(skill_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_employee_skills_proficiency ON employee_skills(proficiency_level) WHERE deleted_at IS NULL;

CREATE INDEX idx_capacity_history_employee ON capacity_history(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_capacity_history_date ON capacity_history(effective_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_capacity_history_temporary ON capacity_history(is_temporary) WHERE deleted_at IS NULL;

-- Add foreign key constraint for departments.manager_id after employees table exists
ALTER TABLE departments ADD CONSTRAINT fk_departments_manager 
  FOREIGN KEY (manager_id) REFERENCES employees(id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER trigger_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_skills_updated_at
  BEFORE UPDATE ON skills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_employee_skills_updated_at
  BEFORE UPDATE ON employee_skills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_capacity_history_updated_at
  BEFORE UPDATE ON capacity_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
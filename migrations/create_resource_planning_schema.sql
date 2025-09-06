-- Migration: Resource Planning Schema Enhancement
-- Description: Add projects, resource allocations, and skill requirements tables
-- Version: 2.0.0

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types for resource planning
CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'cancelled');
CREATE TYPE project_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE requirement_priority AS ENUM ('optional', 'preferred', 'required', 'critical');

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    status project_status NOT NULL DEFAULT 'planning',
    priority project_priority NOT NULL DEFAULT 'medium',
    client_id UUID, -- Future reference to clients table
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    estimated_hours DECIMAL(10,2) NOT NULL CHECK (estimated_hours > 0),
    actual_hours DECIMAL(10,2) CHECK (actual_hours >= 0),
    budget DECIMAL(12,2) CHECK (budget > 0),
    cost_to_date DECIMAL(12,2) DEFAULT 0 CHECK (cost_to_date >= 0),
    manager_id UUID NOT NULL REFERENCES employees(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT projects_date_range_check CHECK (end_date >= start_date),
    CONSTRAINT projects_cost_check CHECK (cost_to_date <= COALESCE(budget, cost_to_date))
);

-- Create resource_allocations table
CREATE TABLE IF NOT EXISTS resource_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    allocated_hours DECIMAL(8,2) NOT NULL CHECK (allocated_hours > 0),
    hourly_rate DECIMAL(8,2) CHECK (hourly_rate > 0),
    role_on_project VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    actual_hours DECIMAL(8,2) CHECK (actual_hours >= 0),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT ra_date_range_check CHECK (end_date >= start_date),
    CONSTRAINT ra_actual_hours_check CHECK (actual_hours <= allocated_hours * 1.5), -- Allow 50% overrun
    
    -- Prevent overlapping allocations for same employee (but allow if one is inactive)
    EXCLUDE USING gist (
        employee_id WITH =,
        daterange(start_date, end_date, '[]') WITH &&
    ) WHERE (is_active = true)
);

-- Create skill_requirements table
CREATE TABLE IF NOT EXISTS skill_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    minimum_proficiency INTEGER NOT NULL CHECK (minimum_proficiency BETWEEN 1 AND 5),
    required_count INTEGER NOT NULL CHECK (required_count > 0),
    fulfilled BOOLEAN NOT NULL DEFAULT FALSE,
    priority requirement_priority NOT NULL DEFAULT 'required',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint to prevent duplicate skill requirements per project
    UNIQUE (project_id, skill_id)
);

-- Add capacity and cost tracking fields to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(8,2) CHECK (hourly_rate > 0),
ADD COLUMN IF NOT EXISTS max_capacity_hours INTEGER DEFAULT 40 CHECK (max_capacity_hours > 0 AND max_capacity_hours <= 80);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_projects_manager ON projects(manager_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_projects_dates ON projects(start_date, end_date) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_resource_allocations_project ON resource_allocations(project_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_resource_allocations_employee ON resource_allocations(employee_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_resource_allocations_dates ON resource_allocations(start_date, end_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_resource_allocations_active ON resource_allocations(is_active, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_skill_requirements_project ON skill_requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_skill_requirements_skill ON skill_requirements(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_requirements_fulfilled ON skill_requirements(fulfilled, priority);

CREATE INDEX IF NOT EXISTS idx_employees_hourly_rate ON employees(hourly_rate) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_employees_capacity ON employees(max_capacity_hours) WHERE is_active = true;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resource_allocations_updated_at 
    BEFORE UPDATE ON resource_allocations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skill_requirements_updated_at 
    BEFORE UPDATE ON skill_requirements 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically update project cost
CREATE OR REPLACE FUNCTION update_project_cost()
RETURNS TRIGGER AS $$
BEGIN
    -- Update cost_to_date for the project based on actual hours and rates
    UPDATE projects 
    SET cost_to_date = (
        SELECT COALESCE(SUM(
            COALESCE(ra.actual_hours, 0) * COALESCE(ra.hourly_rate, 0)
        ), 0)
        FROM resource_allocations ra
        WHERE ra.project_id = NEW.project_id 
        AND ra.is_active = true
    )
    WHERE id = NEW.project_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_project_cost_trigger
    AFTER INSERT OR UPDATE OF actual_hours, hourly_rate 
    ON resource_allocations
    FOR EACH ROW EXECUTE FUNCTION update_project_cost();

-- Create function to check resource allocation capacity
CREATE OR REPLACE FUNCTION check_allocation_capacity()
RETURNS TRIGGER AS $$
DECLARE
    daily_capacity INTEGER;
    allocation_days INTEGER;
    daily_hours DECIMAL;
BEGIN
    -- Skip check if allocation is being deactivated
    IF NEW.is_active = false THEN
        RETURN NEW;
    END IF;
    
    -- Get employee's max capacity
    SELECT max_capacity_hours INTO daily_capacity
    FROM employees 
    WHERE id = NEW.employee_id;
    
    -- Default to 8 hours if not set
    daily_capacity := COALESCE(daily_capacity, 40);
    
    -- Calculate allocation period and daily hours
    allocation_days := NEW.end_date - NEW.start_date + 1;
    daily_hours := NEW.allocated_hours / allocation_days;
    
    -- Check if this allocation would exceed daily capacity
    IF EXISTS (
        SELECT 1 FROM (
            SELECT 
                allocation_date,
                SUM(ra.allocated_hours / (ra.end_date - ra.start_date + 1)) as total_daily_hours
            FROM resource_allocations ra,
                 generate_series(ra.start_date, ra.end_date, '1 day'::interval)::date as allocation_date
            WHERE ra.employee_id = NEW.employee_id
            AND ra.is_active = true
            AND ra.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
            AND allocation_date BETWEEN NEW.start_date AND NEW.end_date
            GROUP BY allocation_date
            HAVING SUM(ra.allocated_hours / (ra.end_date - ra.start_date + 1)) + daily_hours > daily_capacity
        ) capacity_check
    ) THEN
        RAISE EXCEPTION 'Resource allocation would exceed employee daily capacity of % hours', daily_capacity;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER check_allocation_capacity_trigger
    BEFORE INSERT OR UPDATE ON resource_allocations
    FOR EACH ROW EXECUTE FUNCTION check_allocation_capacity();

-- Create view for project resource summary
CREATE OR REPLACE VIEW project_resource_summary AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.status,
    p.priority,
    p.start_date,
    p.end_date,
    p.estimated_hours,
    p.actual_hours,
    p.budget,
    p.cost_to_date,
    COUNT(ra.id) as allocated_resources,
    SUM(ra.allocated_hours) as total_allocated_hours,
    SUM(COALESCE(ra.actual_hours, 0)) as total_actual_hours,
    AVG(COALESCE(ra.hourly_rate, 0)) as avg_hourly_rate,
    COUNT(CASE WHEN sr.fulfilled = false THEN 1 END) as unfulfilled_requirements,
    CASE 
        WHEN p.estimated_hours > 0 THEN 
            (SUM(COALESCE(ra.actual_hours, 0)) / p.estimated_hours) * 100
        ELSE 0 
    END as completion_percentage
FROM projects p
LEFT JOIN resource_allocations ra ON p.id = ra.project_id AND ra.is_active = true
LEFT JOIN skill_requirements sr ON p.id = sr.project_id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.status, p.priority, p.start_date, p.end_date, 
         p.estimated_hours, p.actual_hours, p.budget, p.cost_to_date;

-- Create view for employee workload summary
CREATE OR REPLACE VIEW employee_workload_summary AS
SELECT 
    e.id as employee_id,
    CONCAT(e.first_name, ' ', e.last_name) as employee_name,
    e.position,
    d.name as department_name,
    e.max_capacity_hours,
    COUNT(ra.id) as active_projects,
    SUM(ra.allocated_hours) as total_allocated_hours,
    SUM(COALESCE(ra.actual_hours, 0)) as total_actual_hours,
    CASE 
        WHEN e.max_capacity_hours > 0 THEN
            (SUM(ra.allocated_hours) / (e.max_capacity_hours * 
                (CURRENT_DATE - LEAST(ra.start_date, CURRENT_DATE) + 1))) * 100
        ELSE 0 
    END as utilization_percentage
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN resource_allocations ra ON e.id = ra.employee_id 
    AND ra.is_active = true
    AND ra.start_date <= CURRENT_DATE 
    AND ra.end_date >= CURRENT_DATE
WHERE e.is_active = true
GROUP BY e.id, e.first_name, e.last_name, e.position, d.name, e.max_capacity_hours;

-- Insert sample data for testing (optional)
/*
-- Sample projects
INSERT INTO projects (name, description, status, priority, start_date, end_date, estimated_hours, budget, manager_id) VALUES 
('Website Redesign', 'Complete redesign of company website', 'active', 'high', '2024-01-01', '2024-06-30', 2000, 150000, (SELECT id FROM employees WHERE email = 'manager@company.com' LIMIT 1)),
('Mobile App Development', 'Native iOS and Android app', 'planning', 'critical', '2024-03-01', '2024-12-31', 3500, 300000, (SELECT id FROM employees WHERE email = 'manager@company.com' LIMIT 1)),
('Database Migration', 'Migrate legacy systems to cloud', 'active', 'medium', '2024-02-01', '2024-08-31', 1500, 100000, (SELECT id FROM employees WHERE email = 'manager@company.com' LIMIT 1));

-- Sample skill requirements
INSERT INTO skill_requirements (project_id, skill_id, minimum_proficiency, required_count, priority) VALUES 
((SELECT id FROM projects WHERE name = 'Website Redesign' LIMIT 1), (SELECT id FROM skills WHERE name = 'React' LIMIT 1), 3, 2, 'required'),
((SELECT id FROM projects WHERE name = 'Website Redesign' LIMIT 1), (SELECT id FROM skills WHERE name = 'Node.js' LIMIT 1), 2, 1, 'required'),
((SELECT id FROM projects WHERE name = 'Mobile App Development' LIMIT 1), (SELECT id FROM skills WHERE name = 'React Native' LIMIT 1), 4, 2, 'critical'),
((SELECT id FROM projects WHERE name = 'Database Migration' LIMIT 1), (SELECT id FROM skills WHERE name = 'PostgreSQL' LIMIT 1), 3, 1, 'required');

-- Update employees with hourly rates
UPDATE employees SET hourly_rate = 75.00, max_capacity_hours = 40 WHERE position LIKE '%Senior%';
UPDATE employees SET hourly_rate = 60.00, max_capacity_hours = 40 WHERE position LIKE '%Developer%' AND position NOT LIKE '%Senior%';
UPDATE employees SET hourly_rate = 85.00, max_capacity_hours = 35 WHERE position LIKE '%Lead%' OR position LIKE '%Manager%';
*/

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON projects TO employee_management_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON resource_allocations TO employee_management_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON skill_requirements TO employee_management_app;
GRANT SELECT ON project_resource_summary TO employee_management_app;
GRANT SELECT ON employee_workload_summary TO employee_management_app;
GRANT USAGE ON SEQUENCE projects_id_seq TO employee_management_app;
GRANT USAGE ON SEQUENCE resource_allocations_id_seq TO employee_management_app;
GRANT USAGE ON SEQUENCE skill_requirements_id_seq TO employee_management_app;

-- Migration completed successfully
-- This schema provides comprehensive resource planning capabilities:
-- 1. Project management with timeline and budget tracking
-- 2. Resource allocation with capacity constraints
-- 3. Skill requirement matching and gap analysis
-- 4. Automated cost tracking and utilization monitoring
-- 5. Performance-optimized indexes and views
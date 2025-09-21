-- Create missing tables for tests

-- Add missing columns to employees table
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS salary DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS weekly_hours INTEGER DEFAULT 40;

-- Add missing columns to resource_allocations
ALTER TABLE resource_allocations
ADD COLUMN IF NOT EXISTS planned_allocation_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS planned_hours_per_week DECIMAL(5,2) DEFAULT 0;

-- Create pipeline_projects table
CREATE TABLE IF NOT EXISTS pipeline_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  stage VARCHAR(50) NOT NULL,
  probability INTEGER DEFAULT 50,
  expected_revenue DECIMAL(12,2) DEFAULT 0,
  expected_start_date DATE,
  expected_duration_months INTEGER DEFAULT 3,
  required_resources INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create capacity_bottlenecks table
CREATE TABLE IF NOT EXISTS capacity_bottlenecks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type VARCHAR(100),
  bottleneck_date DATE,
  severity VARCHAR(20),
  affected_projects TEXT[],
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create capacity_history table
CREATE TABLE IF NOT EXISTS capacity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id),
  week_start_date DATE,
  available_hours DECIMAL(5,2),
  allocated_hours DECIMAL(5,2),
  utilization_percentage DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
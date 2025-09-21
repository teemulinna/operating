-- Migration: 026_create_budget_system.sql
-- Description: Create comprehensive budget and financial tracking system
-- Dependencies: projects table must exist
-- Version: 1.0
-- Date: 2024-01-15

-- Create budget status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'budget_status_type') THEN
    CREATE TYPE budget_status_type AS ENUM (
      'draft',
      'approved', 
      'active',
      'completed',
      'overbudget',
      'cancelled'
    );
  END IF;
END
$$;

-- Create currency enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'currency_type') THEN
    CREATE TYPE currency_type AS ENUM (
      'USD',
      'EUR',
      'GBP', 
      'JPY',
      'CAD',
      'AUD'
    );
  END IF;
END
$$;

-- Create cost category enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cost_category_type') THEN
    CREATE TYPE cost_category_type AS ENUM (
      'labor',
      'materials',
      'overhead',
      'equipment',
      'travel',
      'other'
    );
  END IF;
END
$$;

-- Create cost type enum  
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cost_type') THEN
    CREATE TYPE cost_type AS ENUM (
      'hourly',
      'daily',
      'weekly', 
      'monthly',
      'project_based',
      'fixed'
    );
  END IF;
END
$$;

-- Create rate type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rate_type') THEN
    CREATE TYPE rate_type AS ENUM (
      'standard',
      'overtime',
      'double_time',
      'weekend',
      'holiday', 
      'emergency'
    );
  END IF;
END
$$;

-- Create billing type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_type') THEN
    CREATE TYPE billing_type AS ENUM (
      'billable',
      'non_billable',
      'internal',
      'overhead'
    );
  END IF;
END
$$;

-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  total_budget DECIMAL(15,2) NOT NULL CHECK (total_budget >= 0),
  allocated_budget DECIMAL(15,2) DEFAULT 0 CHECK (allocated_budget >= 0),
  spent_budget DECIMAL(15,2) DEFAULT 0 CHECK (spent_budget >= 0),
  committed_budget DECIMAL(15,2) DEFAULT 0 CHECK (committed_budget >= 0),
  cost_categories JSONB DEFAULT '{}',
  currency currency_type DEFAULT 'USD',
  status budget_status_type DEFAULT 'draft',
  budget_periods JSONB,
  contingency_percentage DECIMAL(5,2) DEFAULT 10.00 CHECK (contingency_percentage >= 0 AND contingency_percentage <= 100),
  approval_workflow JSONB,
  cost_centers JSONB,
  notes TEXT,
  exchange_rates JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  updated_by VARCHAR(255),
  
  CONSTRAINT fk_budget_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT unique_project_active_budget UNIQUE (project_id) DEFERRABLE INITIALLY DEFERRED
);

-- Create resource_costs table
CREATE TABLE IF NOT EXISTS resource_costs (
  id SERIAL PRIMARY KEY,
  employee_id UUID NOT NULL,
  base_rate DECIMAL(10,2) NOT NULL CHECK (base_rate >= 0),
  overtime_rate DECIMAL(10,2) CHECK (overtime_rate >= 0),
  double_time_rate DECIMAL(10,2) CHECK (double_time_rate >= 0),
  billable_rate DECIMAL(10,2) CHECK (billable_rate >= 0),
  cost_type cost_type DEFAULT 'hourly',
  rate_type rate_type DEFAULT 'standard',
  billing_type billing_type DEFAULT 'billable',
  currency currency_type DEFAULT 'USD',
  cost_center_code VARCHAR(20),
  cost_center_name VARCHAR(100),
  effective_date DATE NOT NULL,
  end_date DATE,
  rate_modifiers JSONB,
  overtime_rules JSONB,
  benefits_cost JSONB,
  utilization_target DECIMAL(5,2) CHECK (utilization_target >= 0 AND utilization_target <= 100),
  project_rates JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  updated_by VARCHAR(255),
  
  CONSTRAINT fk_resource_cost_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT check_date_range CHECK (end_date IS NULL OR end_date >= effective_date),
  CONSTRAINT unique_employee_rate_date UNIQUE (employee_id, rate_type, effective_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_budgets_project_id ON budgets(project_id);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(status);
CREATE INDEX IF NOT EXISTS idx_budgets_created_at ON budgets(created_at);

CREATE INDEX IF NOT EXISTS idx_resource_costs_employee_id ON resource_costs(employee_id);
CREATE INDEX IF NOT EXISTS idx_resource_costs_effective_date ON resource_costs(effective_date);
CREATE INDEX IF NOT EXISTS idx_resource_costs_cost_center ON resource_costs(cost_center_code);
CREATE INDEX IF NOT EXISTS idx_resource_costs_active ON resource_costs(is_active);
CREATE INDEX IF NOT EXISTS idx_resource_costs_employee_active ON resource_costs(employee_id, is_active) WHERE is_active = TRUE;

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to budgets table
DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;
CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to resource_costs table  
DROP TRIGGER IF EXISTS update_resource_costs_updated_at ON resource_costs;
CREATE TRIGGER update_resource_costs_updated_at
  BEFORE UPDATE ON resource_costs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add budget-related columns to projects table if they don't exist
DO $$
BEGIN
  -- Add budget column to projects if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'budget_id') THEN
    ALTER TABLE projects ADD COLUMN budget_id INTEGER;
    ALTER TABLE projects ADD CONSTRAINT fk_project_budget FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE SET NULL;
  END IF;
  
  -- Add cost tracking columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'total_cost') THEN
    ALTER TABLE projects ADD COLUMN total_cost DECIMAL(15,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'cost_to_date') THEN
    ALTER TABLE projects ADD COLUMN cost_to_date DECIMAL(15,2) DEFAULT 0;
  END IF;
END
$$;

-- Add cost tracking to resource_allocations table
DO $$
BEGIN
  -- Add cost per hour if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resource_allocations' AND column_name = 'cost_per_hour') THEN
    ALTER TABLE resource_allocations ADD COLUMN cost_per_hour DECIMAL(10,2);
  END IF;
  
  -- Add total cost if it doesn't exist  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resource_allocations' AND column_name = 'total_cost') THEN
    ALTER TABLE resource_allocations ADD COLUMN total_cost DECIMAL(12,2);
  END IF;
  
  -- Add budget category if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resource_allocations' AND column_name = 'budget_category') THEN
    ALTER TABLE resource_allocations ADD COLUMN budget_category cost_category_type DEFAULT 'labor';
  END IF;
END
$$;

-- Create view for budget analytics
CREATE OR REPLACE VIEW budget_analytics AS
SELECT 
  b.id,
  b.project_id,
  p.name as project_name,
  b.total_budget,
  b.allocated_budget,
  b.spent_budget,
  b.committed_budget,
  b.total_budget - b.spent_budget - b.committed_budget as remaining_budget,
  CASE 
    WHEN b.total_budget > 0 THEN 
      ((b.spent_budget + b.committed_budget) / b.total_budget) * 100
    ELSE 0 
  END as utilization_percentage,
  b.currency,
  b.status,
  b.contingency_percentage,
  (b.total_budget * b.contingency_percentage / 100) as contingency_amount,
  CASE 
    WHEN ((b.spent_budget + b.committed_budget) / NULLIF(b.total_budget, 0)) * 100 <= 75 THEN 'healthy'
    WHEN ((b.spent_budget + b.committed_budget) / NULLIF(b.total_budget, 0)) * 100 <= 95 THEN 'warning'
    ELSE 'critical'
  END as health_status,
  b.created_at,
  b.updated_at
FROM budgets b
JOIN projects p ON b.project_id = p.id;

-- Create view for current employee rates
CREATE OR REPLACE VIEW current_employee_rates AS
SELECT DISTINCT ON (rc.employee_id)
  rc.employee_id,
  e.first_name,
  e.last_name,
  rc.base_rate,
  rc.overtime_rate,
  rc.billable_rate,
  rc.cost_type,
  rc.rate_type,
  rc.billing_type,
  rc.currency,
  rc.cost_center_code,
  rc.cost_center_name,
  rc.effective_date,
  rc.utilization_target,
  rc.is_active
FROM resource_costs rc
JOIN employees e ON rc.employee_id = e.id
WHERE rc.is_active = TRUE
  AND rc.effective_date <= CURRENT_DATE
  AND (rc.end_date IS NULL OR rc.end_date >= CURRENT_DATE)
ORDER BY rc.employee_id, rc.effective_date DESC;

-- Insert initial data / examples (optional)
DO $$
BEGIN
  -- Example: Create sample budget data for existing projects (only if there are projects)
  IF EXISTS (SELECT 1 FROM projects LIMIT 1) THEN
    -- This would typically be done through the application, not in migration
    -- INSERT INTO budgets (project_id, total_budget, currency, status) 
    -- SELECT id, 50000, 'USD', 'draft' FROM projects WHERE id = 1 AND NOT EXISTS (SELECT 1 FROM budgets WHERE project_id = 1);
    NULL;
  END IF;
END
$$;

-- Grant permissions (adjust based on your user roles)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON budgets TO application_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON resource_costs TO application_user;
-- GRANT SELECT ON budget_analytics TO application_user;
-- GRANT SELECT ON current_employee_rates TO application_user;

COMMENT ON TABLE budgets IS 'Project budget management with cost tracking and financial analytics';
COMMENT ON TABLE resource_costs IS 'Employee cost rates and billing information with historical tracking';
COMMENT ON VIEW budget_analytics IS 'Real-time budget analytics and utilization metrics';
COMMENT ON VIEW current_employee_rates IS 'Current active rates for all employees';

-- Migration completed successfully
SELECT 'Budget system migration completed successfully!' as status;
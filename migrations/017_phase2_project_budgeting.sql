-- Phase 2: Project Budgeting System
-- Migration 017: Budget Management and Financial Tracking

-- Project budgets with detailed breakdown
CREATE TABLE IF NOT EXISTS project_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version INTEGER DEFAULT 1,
    total_budget DECIMAL(12,2) NOT NULL,
    labor_budget DECIMAL(12,2) NOT NULL,
    non_labor_budget DECIMAL(12,2) NOT NULL,
    contingency_percentage DECIMAL(5,2) DEFAULT 10.0,
    currency VARCHAR(3) DEFAULT 'USD',
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMP,
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'revised')),
    effective_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, version)
);

-- Budget categories breakdown
CREATE TABLE IF NOT EXISTS budget_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL REFERENCES project_budgets(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    amount DECIMAL(12,2) NOT NULL,
    percentage_of_total DECIMAL(5,2),
    description TEXT,
    is_fixed_cost BOOLEAN DEFAULT false
);

-- Rate cards for different roles and skills
CREATE TABLE IF NOT EXISTS rate_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(100),
    skill VARCHAR(100),
    level VARCHAR(20),
    department VARCHAR(50),
    hourly_rate DECIMAL(8,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES employees(id),
    approved_by UUID REFERENCES employees(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project cost tracking
CREATE TABLE IF NOT EXISTS project_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id INTEGER NOT NULL REFERENCES projects(id),
    budget_id UUID REFERENCES project_budgets(id),
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    cost_type VARCHAR(30) CHECK (cost_type IN ('labor', 'material', 'overhead', 'external', 'travel', 'other')),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    cost_date DATE NOT NULL DEFAULT CURRENT_DATE,
    employee_id UUID REFERENCES employees(id),
    hours_worked DECIMAL(6,2),
    hourly_rate DECIMAL(8,2),
    description TEXT,
    invoice_reference VARCHAR(100),
    is_billable BOOLEAN DEFAULT true,
    approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budget forecasts and predictions
CREATE TABLE IF NOT EXISTS budget_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id INTEGER NOT NULL REFERENCES projects(id),
    forecast_date DATE NOT NULL DEFAULT CURRENT_DATE,
    forecast_period VARCHAR(20) NOT NULL, -- 'next_month', 'next_quarter', 'project_end'
    scenario VARCHAR(20) DEFAULT 'realistic' CHECK (scenario IN ('optimistic', 'realistic', 'pessimistic')),
    forecasted_total_cost DECIMAL(12,2),
    forecasted_labor_cost DECIMAL(12,2),
    forecasted_non_labor_cost DECIMAL(12,2),
    confidence_level DECIMAL(5,2), -- 0-100%
    risk_factors JSONB,
    assumptions JSONB,
    methodology VARCHAR(50), -- 'historical', 'bottom_up', 'parametric', 'expert_judgment'
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budget revisions and change requests
CREATE TABLE IF NOT EXISTS budget_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id INTEGER NOT NULL REFERENCES projects(id),
    original_budget_id UUID NOT NULL REFERENCES project_budgets(id),
    requested_by UUID NOT NULL REFERENCES employees(id),
    new_total_budget DECIMAL(12,2) NOT NULL,
    revision_reason TEXT NOT NULL,
    justification TEXT,
    impact_analysis JSONB, -- Schedule, scope, resource impacts
    business_case TEXT,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES employees(id),
    reviewed_at TIMESTAMP,
    approval_level VARCHAR(20), -- 'manager', 'director', 'executive'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cost variance analysis
CREATE TABLE IF NOT EXISTS cost_variance_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id INTEGER NOT NULL REFERENCES projects(id),
    analysis_period_start DATE NOT NULL,
    analysis_period_end DATE NOT NULL,
    planned_cost DECIMAL(12,2),
    actual_cost DECIMAL(12,2),
    cost_variance DECIMAL(12,2), -- actual - planned
    cost_variance_percentage DECIMAL(5,2),
    schedule_variance DECIMAL(12,2),
    cost_performance_index DECIMAL(5,2), -- earned value / actual cost
    schedule_performance_index DECIMAL(5,2), -- earned value / planned value
    earned_value DECIMAL(12,2),
    variance_reasons JSONB,
    corrective_actions JSONB,
    analysis_date DATE DEFAULT CURRENT_DATE,
    analyzed_by UUID REFERENCES employees(id)
);

-- Market rate benchmarks
CREATE TABLE IF NOT EXISTS market_rate_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(100) NOT NULL,
    level VARCHAR(20),
    location VARCHAR(100), -- City, State/Country
    market_rate_min DECIMAL(8,2),
    market_rate_max DECIMAL(8,2),
    market_rate_avg DECIMAL(8,2),
    currency VARCHAR(3) DEFAULT 'USD',
    data_source VARCHAR(100), -- Source of benchmark data
    effective_date DATE NOT NULL,
    confidence_level VARCHAR(20), -- 'high', 'medium', 'low'
    sample_size INTEGER,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_budgets_project_id ON project_budgets(project_id);
CREATE INDEX IF NOT EXISTS idx_project_budgets_status ON project_budgets(status);
CREATE INDEX IF NOT EXISTS idx_budget_categories_budget_id ON budget_categories(budget_id);
CREATE INDEX IF NOT EXISTS idx_rate_cards_role ON rate_cards(role);
CREATE INDEX IF NOT EXISTS idx_rate_cards_effective_date ON rate_cards(effective_date);
CREATE INDEX IF NOT EXISTS idx_rate_cards_active ON rate_cards(is_active);
CREATE INDEX IF NOT EXISTS idx_project_costs_project_id ON project_costs(project_id);
CREATE INDEX IF NOT EXISTS idx_project_costs_date ON project_costs(cost_date);
CREATE INDEX IF NOT EXISTS idx_project_costs_employee ON project_costs(employee_id);
CREATE INDEX IF NOT EXISTS idx_budget_forecasts_project_id ON budget_forecasts(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_revisions_project_id ON budget_revisions(project_id);
CREATE INDEX IF NOT EXISTS idx_cost_variance_project_id ON cost_variance_analysis(project_id);

-- Insert default rate cards for common roles
INSERT INTO rate_cards (role, level, department, hourly_rate, effective_date, created_at) VALUES
-- Engineering rates
('Software Engineer', 'Junior', 'Engineering', 45.00, '2024-01-01', CURRENT_TIMESTAMP),
('Software Engineer', 'Mid', 'Engineering', 65.00, '2024-01-01', CURRENT_TIMESTAMP),
('Software Engineer', 'Senior', 'Engineering', 85.00, '2024-01-01', CURRENT_TIMESTAMP),
('Frontend Developer', 'Junior', 'Engineering', 45.00, '2024-01-01', CURRENT_TIMESTAMP),
('Frontend Developer', 'Mid', 'Engineering', 60.00, '2024-01-01', CURRENT_TIMESTAMP),
('Frontend Developer', 'Senior', 'Engineering', 80.00, '2024-01-01', CURRENT_TIMESTAMP),
('Backend Developer', 'Junior', 'Engineering', 50.00, '2024-01-01', CURRENT_TIMESTAMP),
('Backend Developer', 'Mid', 'Engineering', 70.00, '2024-01-01', CURRENT_TIMESTAMP),
('Backend Developer', 'Senior', 'Engineering', 90.00, '2024-01-01', CURRENT_TIMESTAMP),
('Full Stack Developer', 'Junior', 'Engineering', 50.00, '2024-01-01', CURRENT_TIMESTAMP),
('Full Stack Developer', 'Mid', 'Engineering', 70.00, '2024-01-01', CURRENT_TIMESTAMP),
('Full Stack Developer', 'Senior', 'Engineering', 90.00, '2024-01-01', CURRENT_TIMESTAMP),
('DevOps Engineer', 'Mid', 'Engineering', 80.00, '2024-01-01', CURRENT_TIMESTAMP),
('DevOps Engineer', 'Senior', 'Engineering', 100.00, '2024-01-01', CURRENT_TIMESTAMP),

-- Product & Design rates
('Product Manager', 'Mid', 'Product', 75.00, '2024-01-01', CURRENT_TIMESTAMP),
('Product Manager', 'Senior', 'Product', 95.00, '2024-01-01', CURRENT_TIMESTAMP),
('UX Designer', 'Mid', 'Design', 65.00, '2024-01-01', CURRENT_TIMESTAMP),
('UX Designer', 'Senior', 'Design', 85.00, '2024-01-01', CURRENT_TIMESTAMP),
('UI Designer', 'Mid', 'Design', 60.00, '2024-01-01', CURRENT_TIMESTAMP),
('UI Designer', 'Senior', 'Design', 80.00, '2024-01-01', CURRENT_TIMESTAMP),

-- Data & Analytics rates
('Data Scientist', 'Mid', 'Data', 90.00, '2024-01-01', CURRENT_TIMESTAMP),
('Data Scientist', 'Senior', 'Data', 110.00, '2024-01-01', CURRENT_TIMESTAMP),
('Data Analyst', 'Junior', 'Data', 55.00, '2024-01-01', CURRENT_TIMESTAMP),
('Data Analyst', 'Mid', 'Data', 70.00, '2024-01-01', CURRENT_TIMESTAMP),

-- Management rates
('Engineering Manager', 'Lead', 'Engineering', 100.00, '2024-01-01', CURRENT_TIMESTAMP),
('Product Manager', 'Lead', 'Product', 105.00, '2024-01-01', CURRENT_TIMESTAMP),
('Project Manager', 'Mid', 'Operations', 70.00, '2024-01-01', CURRENT_TIMESTAMP),
('Project Manager', 'Senior', 'Operations', 90.00, '2024-01-01', CURRENT_TIMESTAMP)

ON CONFLICT DO NOTHING;

-- Create triggers for updated_at
CREATE TRIGGER update_project_budgets_updated_at BEFORE UPDATE ON project_budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
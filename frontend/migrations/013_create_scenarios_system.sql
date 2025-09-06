-- Phase 3: Scenarios and Forecasting System
-- Migration for scenario planning and resource forecasting

-- Scenarios table for what-if modeling
CREATE TABLE scenarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'what-if', -- 'what-if', 'forecast', 'template'
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'archived'
    base_date DATE NOT NULL DEFAULT CURRENT_DATE,
    forecast_period_months INTEGER NOT NULL DEFAULT 12,
    created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}', -- Additional scenario parameters
    is_template BOOLEAN DEFAULT FALSE,
    template_category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scenario allocations for tentative vs committed resource assignments
CREATE TABLE scenario_allocations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    role_id UUID REFERENCES project_roles(id) ON DELETE SET NULL,
    allocation_type VARCHAR(50) NOT NULL DEFAULT 'tentative', -- 'tentative', 'probable', 'confirmed'
    allocation_percentage DECIMAL(5,2) NOT NULL CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
    start_date DATE NOT NULL,
    end_date DATE,
    estimated_hours INTEGER,
    hourly_rate DECIMAL(10,2),
    confidence_level INTEGER CHECK (confidence_level >= 1 AND confidence_level <= 5), -- 1-5 scale
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(scenario_id, project_id, employee_id, start_date)
);

-- Resource demand forecasting
CREATE TABLE resource_demand_forecast (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    skill_category VARCHAR(100) NOT NULL,
    position_level VARCHAR(50) NOT NULL, -- 'junior', 'intermediate', 'senior', 'expert'
    forecast_date DATE NOT NULL,
    demand_hours INTEGER NOT NULL,
    supply_hours INTEGER NOT NULL,
    gap_hours INTEGER GENERATED ALWAYS AS (demand_hours - supply_hours) STORED,
    utilization_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN supply_hours > 0 THEN (LEAST(demand_hours, supply_hours)::DECIMAL / supply_hours) * 100
            ELSE 0
        END
    ) STORED,
    hiring_recommendation INTEGER DEFAULT 0, -- Number of people to hire
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scenario comparison results (cached for performance)
CREATE TABLE scenario_comparisons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scenario_a_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    scenario_b_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    comparison_metrics JSONB NOT NULL, -- JSON object with comparison data
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    UNIQUE(scenario_a_id, scenario_b_id)
);

-- Custom reports configuration
CREATE TABLE custom_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL, -- 'dashboard', 'chart', 'table', 'combined'
    config JSONB NOT NULL, -- Report configuration (metrics, filters, layout)
    schedule JSONB, -- Automated report schedule
    created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT FALSE,
    tags VARCHAR(100)[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Report execution history
CREATE TABLE report_executions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES custom_reports(id) ON DELETE CASCADE,
    executed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    execution_time_ms INTEGER,
    status VARCHAR(50) NOT NULL, -- 'success', 'error', 'timeout'
    result_data JSONB,
    error_message TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_scenarios_status ON scenarios(status);
CREATE INDEX idx_scenarios_type ON scenarios(type);
CREATE INDEX idx_scenarios_created_by ON scenarios(created_by);
CREATE INDEX idx_scenarios_base_date ON scenarios(base_date);

CREATE INDEX idx_scenario_allocations_scenario_id ON scenario_allocations(scenario_id);
CREATE INDEX idx_scenario_allocations_project_id ON scenario_allocations(project_id);
CREATE INDEX idx_scenario_allocations_employee_id ON scenario_allocations(employee_id);
CREATE INDEX idx_scenario_allocations_date_range ON scenario_allocations(start_date, end_date);
CREATE INDEX idx_scenario_allocations_type ON scenario_allocations(allocation_type);

CREATE INDEX idx_resource_demand_forecast_scenario_id ON resource_demand_forecast(scenario_id);
CREATE INDEX idx_resource_demand_forecast_date ON resource_demand_forecast(forecast_date);
CREATE INDEX idx_resource_demand_forecast_skill ON resource_demand_forecast(skill_category, position_level);

CREATE INDEX idx_scenario_comparisons_scenarios ON scenario_comparisons(scenario_a_id, scenario_b_id);
CREATE INDEX idx_scenario_comparisons_expires ON scenario_comparisons(expires_at);

CREATE INDEX idx_custom_reports_created_by ON custom_reports(created_by);
CREATE INDEX idx_custom_reports_type ON custom_reports(report_type);
CREATE INDEX idx_custom_reports_tags ON custom_reports USING GIN(tags);

CREATE INDEX idx_report_executions_report_id ON report_executions(report_id);
CREATE INDEX idx_report_executions_executed_at ON report_executions(executed_at);

-- Views for common queries
CREATE VIEW scenario_summary AS
SELECT 
    s.id,
    s.name,
    s.description,
    s.type,
    s.status,
    s.base_date,
    s.forecast_period_months,
    s.created_at,
    COUNT(sa.id) as total_allocations,
    COUNT(CASE WHEN sa.allocation_type = 'confirmed' THEN 1 END) as confirmed_allocations,
    COUNT(CASE WHEN sa.allocation_type = 'probable' THEN 1 END) as probable_allocations,
    COUNT(CASE WHEN sa.allocation_type = 'tentative' THEN 1 END) as tentative_allocations,
    COALESCE(SUM(sa.estimated_hours), 0) as total_estimated_hours,
    COALESCE(AVG(sa.allocation_percentage), 0) as avg_allocation_percentage
FROM scenarios s
LEFT JOIN scenario_allocations sa ON s.id = sa.scenario_id
GROUP BY s.id, s.name, s.description, s.type, s.status, s.base_date, s.forecast_period_months, s.created_at;

CREATE VIEW resource_utilization_forecast AS
SELECT 
    rdf.scenario_id,
    rdf.skill_category,
    rdf.position_level,
    rdf.forecast_date,
    rdf.demand_hours,
    rdf.supply_hours,
    rdf.gap_hours,
    rdf.utilization_rate,
    rdf.hiring_recommendation,
    CASE 
        WHEN rdf.gap_hours > 0 THEN 'understaffed'
        WHEN rdf.gap_hours < 0 THEN 'overstaffed'
        ELSE 'balanced'
    END as staffing_status
FROM resource_demand_forecast rdf;

-- Trigger to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_scenarios_updated_at BEFORE UPDATE ON scenarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scenario_allocations_updated_at BEFORE UPDATE ON scenario_allocations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_custom_reports_updated_at BEFORE UPDATE ON custom_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for development
INSERT INTO scenarios (name, description, type, status, base_date, forecast_period_months, metadata, created_by) VALUES
('Q1 2025 Planning', 'Initial resource planning for Q1 2025 projects', 'what-if', 'active', '2025-01-01', 3, '{"priority": "high", "department": "engineering"}', (SELECT id FROM employees LIMIT 1)),
('Expansion Scenario', 'What-if scenario for team expansion', 'forecast', 'draft', '2025-02-01', 12, '{"growth_rate": 0.25, "budget_increase": 0.3}', (SELECT id FROM employees LIMIT 1)),
('Conservative Planning', 'Conservative resource allocation template', 'template', 'active', '2025-01-01', 6, '{"risk_level": "low", "buffer_percentage": 0.2}', (SELECT id FROM employees LIMIT 1));
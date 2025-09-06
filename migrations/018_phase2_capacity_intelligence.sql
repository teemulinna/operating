-- Phase 2: Capacity Intelligence System
-- Migration 018: Advanced Capacity Analytics and Predictions

-- Capacity predictions and forecasting
CREATE TABLE IF NOT EXISTS capacity_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    prediction_horizon VARCHAR(20) NOT NULL, -- 'next_month', 'next_quarter', 'next_6_months', 'next_year'
    department VARCHAR(50),
    skill VARCHAR(100),
    prediction_type VARCHAR(30) CHECK (prediction_type IN ('demand', 'supply', 'utilization', 'bottleneck')),
    predicted_value DECIMAL(10,2),
    confidence_level DECIMAL(5,2), -- 0-100%
    scenario VARCHAR(20) DEFAULT 'realistic' CHECK (scenario IN ('optimistic', 'realistic', 'pessimistic')),
    model_version VARCHAR(20),
    input_factors JSONB, -- Factors used in prediction
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP -- When prediction becomes stale
);

-- Capacity bottleneck identification and tracking
CREATE TABLE IF NOT EXISTS capacity_bottlenecks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identified_date DATE NOT NULL DEFAULT CURRENT_DATE,
    bottleneck_type VARCHAR(30) CHECK (bottleneck_type IN ('skill', 'department', 'resource', 'time')),
    affected_resource VARCHAR(100) NOT NULL, -- Skill name, department, specific resource
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    impact_score DECIMAL(5,2), -- 0-100 impact on overall capacity
    affected_projects JSONB, -- Array of project IDs affected
    estimated_duration_days INTEGER,
    root_causes JSONB, -- Array of root cause descriptions
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'mitigated', 'resolved')),
    resolution_date DATE,
    resolution_actions JSONB,
    created_by UUID REFERENCES employees(id),
    assigned_to UUID REFERENCES employees(id)
);

-- Capacity optimization recommendations
CREATE TABLE IF NOT EXISTS capacity_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    recommendation_type VARCHAR(30) CHECK (recommendation_type IN ('hiring', 'training', 'reallocation', 'process_improvement', 'tool_adoption')),
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    expected_impact_percentage DECIMAL(5,2),
    implementation_cost DECIMAL(10,2),
    implementation_time_weeks INTEGER,
    affected_departments JSONB,
    affected_skills JSONB,
    success_metrics JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_progress', 'completed', 'rejected')),
    approved_by UUID REFERENCES employees(id),
    implemented_by UUID REFERENCES employees(id),
    completion_date DATE,
    actual_impact_percentage DECIMAL(5,2),
    roi_percentage DECIMAL(8,2), -- Return on investment
    created_by INTEGER REFERENCES employees(id)
);

-- Capacity utilization patterns and trends
CREATE TABLE IF NOT EXISTS capacity_utilization_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_period_start DATE NOT NULL,
    analysis_period_end DATE NOT NULL,
    department VARCHAR(50),
    skill VARCHAR(100),
    employee_id UUID REFERENCES employees(id),
    pattern_type VARCHAR(30) CHECK (pattern_type IN ('seasonal', 'cyclical', 'trending', 'anomalous')),
    average_utilization DECIMAL(5,2),
    peak_utilization DECIMAL(5,2),
    peak_period VARCHAR(50), -- Description of when peaks occur
    low_utilization DECIMAL(5,2),
    low_period VARCHAR(50), -- Description of when lows occur
    volatility_score DECIMAL(5,2), -- How much utilization varies
    pattern_confidence DECIMAL(5,2), -- Confidence in pattern identification
    analysis_date DATE DEFAULT CURRENT_DATE,
    analyzed_by UUID REFERENCES employees(id)
);

-- Scenario analysis results
CREATE TABLE IF NOT EXISTS capacity_scenario_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id VARCHAR(100) NOT NULL, -- Unique identifier for scenario
    scenario_name VARCHAR(200) NOT NULL,
    scenario_description TEXT,
    analysis_date DATE DEFAULT CURRENT_DATE,
    base_assumptions JSONB, -- Current state assumptions
    scenario_changes JSONB, -- What changes in the scenario
    predicted_outcomes JSONB, -- Expected results
    risk_factors JSONB, -- Identified risks
    mitigation_strategies JSONB, -- Risk mitigation approaches
    confidence_level DECIMAL(5,2),
    recommendation TEXT,
    created_by INTEGER REFERENCES employees(id)
);

-- Capacity alerts configuration
CREATE TABLE IF NOT EXISTS capacity_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_name VARCHAR(100) NOT NULL,
    alert_type VARCHAR(30) CHECK (alert_type IN ('utilization_threshold', 'skill_shortage', 'bottleneck_detected', 'forecast_deviation')),
    is_active BOOLEAN DEFAULT true,
    threshold_value DECIMAL(10,2),
    comparison_operator VARCHAR(10) CHECK (comparison_operator IN ('>', '<', '>=', '<=', '=')),
    scope VARCHAR(30) CHECK (scope IN ('global', 'department', 'skill', 'project')),
    scope_filter VARCHAR(100), -- Department name, skill name, etc.
    notification_channels JSONB, -- email, slack, webhook endpoints
    alert_frequency VARCHAR(20) CHECK (alert_frequency IN ('immediate', 'hourly', 'daily', 'weekly')),
    last_triggered TIMESTAMP,
    trigger_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Capacity metrics snapshots for historical tracking
CREATE TABLE IF NOT EXISTS capacity_metrics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    snapshot_time TIME NOT NULL DEFAULT CURRENT_TIME,
    overall_utilization DECIMAL(5,2),
    available_capacity_hours INTEGER,
    committed_capacity_hours INTEGER,
    department_metrics JSONB, -- Utilization by department
    skill_metrics JSONB, -- Utilization by skill
    bottleneck_count INTEGER,
    critical_bottleneck_count INTEGER,
    forecast_accuracy_score DECIMAL(5,2), -- How accurate recent forecasts were
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Machine learning model metadata for capacity predictions
CREATE TABLE IF NOT EXISTS capacity_ml_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(100) NOT NULL,
    model_type VARCHAR(50) NOT NULL, -- 'time_series', 'regression', 'neural_network', etc.
    version VARCHAR(20) NOT NULL,
    training_data_period_start DATE,
    training_data_period_end DATE,
    features JSONB, -- Features used in the model
    hyperparameters JSONB, -- Model configuration
    training_accuracy DECIMAL(5,2),
    validation_accuracy DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    trained_at TIMESTAMP,
    trained_by UUID REFERENCES employees(id),
    model_file_path VARCHAR(500), -- Path to saved model file
    performance_metrics JSONB -- Detailed performance metrics
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_capacity_predictions_date ON capacity_predictions(prediction_date);
CREATE INDEX IF NOT EXISTS idx_capacity_predictions_department ON capacity_predictions(department);
CREATE INDEX IF NOT EXISTS idx_capacity_predictions_skill ON capacity_predictions(skill);
CREATE INDEX IF NOT EXISTS idx_capacity_bottlenecks_date ON capacity_bottlenecks(identified_date);
CREATE INDEX IF NOT EXISTS idx_capacity_bottlenecks_severity ON capacity_bottlenecks(severity);
CREATE INDEX IF NOT EXISTS idx_capacity_bottlenecks_status ON capacity_bottlenecks(status);
CREATE INDEX IF NOT EXISTS idx_capacity_recommendations_priority ON capacity_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_capacity_recommendations_status ON capacity_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_capacity_utilization_patterns_period ON capacity_utilization_patterns(analysis_period_start, analysis_period_end);
CREATE INDEX IF NOT EXISTS idx_capacity_alerts_active ON capacity_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_capacity_metrics_snapshots_date ON capacity_metrics_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_capacity_ml_models_active ON capacity_ml_models(is_active);

-- Insert default capacity alert configurations
INSERT INTO capacity_alerts (alert_name, alert_type, threshold_value, comparison_operator, scope, notification_channels) VALUES
('High Overall Utilization', 'utilization_threshold', 85.0, '>', 'global', '{"email": ["capacity@company.com"], "slack": ["#capacity-alerts"]}'),
('Critical Utilization', 'utilization_threshold', 95.0, '>', 'global', '{"email": ["capacity@company.com", "management@company.com"], "slack": ["#capacity-alerts", "#management"]}'),
('Engineering Department High Utilization', 'utilization_threshold', 90.0, '>', 'department', '{"email": ["engineering@company.com"], "scope_filter": "Engineering"}'),
('React Skill Shortage', 'skill_shortage', 2.0, '<', 'skill', '{"email": ["tech-leads@company.com"], "scope_filter": "React"}'),
('JavaScript Skill Shortage', 'skill_shortage', 3.0, '<', 'skill', '{"email": ["tech-leads@company.com"], "scope_filter": "JavaScript"}')
ON CONFLICT DO NOTHING;

-- Create a function to update capacity metrics snapshots
CREATE OR REPLACE FUNCTION create_capacity_snapshot()
RETURNS void AS $$
BEGIN
    INSERT INTO capacity_metrics_snapshots (
        snapshot_date,
        snapshot_time,
        overall_utilization,
        available_capacity_hours,
        committed_capacity_hours,
        department_metrics,
        skill_metrics,
        bottleneck_count,
        critical_bottleneck_count
    )
    SELECT 
        CURRENT_DATE,
        CURRENT_TIME,
        -- Calculate overall utilization (placeholder - would be actual calculation)
        80.5,
        -- Available capacity hours (placeholder)
        2000,
        -- Committed capacity hours (placeholder)
        1610,
        -- Department metrics (placeholder JSON)
        '{"Engineering": {"utilization": 85.2, "available_hours": 800}, "Product": {"utilization": 75.3, "available_hours": 300}}'::jsonb,
        -- Skill metrics (placeholder JSON)
        '{"React": {"utilization": 90.1, "available_resources": 5}, "Node.js": {"utilization": 82.4, "available_resources": 7}}'::jsonb,
        -- Bottleneck count
        (SELECT COUNT(*) FROM capacity_bottlenecks WHERE status = 'active'),
        -- Critical bottleneck count
        (SELECT COUNT(*) FROM capacity_bottlenecks WHERE status = 'active' AND severity = 'critical');
END;
$$ LANGUAGE plpgsql;
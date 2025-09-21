-- Migration: Create forecasting and AI capacity planning tables
-- Purpose: Support AI-powered capacity forecasting engine with pattern recognition and scenario planning

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create capacity scenarios table for what-if analysis
CREATE TABLE IF NOT EXISTS capacity_scenarios (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    time_horizon INTEGER NOT NULL, -- Days
    projects_data JSONB NOT NULL, -- Project configurations
    constraints_data JSONB DEFAULT '[]'::jsonb, -- Constraints and limits
    status VARCHAR(50) DEFAULT 'active',
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create forecasting models table to store ML model metadata
CREATE TABLE IF NOT EXISTS forecasting_models (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'arima', 'neural', 'ensemble'
    version VARCHAR(50) NOT NULL,
    parameters JSONB DEFAULT '{}'::jsonb,
    performance_metrics JSONB DEFAULT '{}'::jsonb,
    training_data_range JSONB NOT NULL, -- Start/end dates and size
    model_path TEXT, -- Path to serialized model
    status VARCHAR(50) DEFAULT 'active',
    accuracy DECIMAL(5,4),
    mae DECIMAL(10,6), -- Mean Absolute Error
    rmse DECIMAL(10,6), -- Root Mean Square Error
    r2_score DECIMAL(5,4), -- R-squared score
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create capacity patterns table for recognized patterns
CREATE TABLE IF NOT EXISTS capacity_patterns (
    id SERIAL PRIMARY KEY,
    pattern_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    type VARCHAR(100) NOT NULL, -- 'workload_peak', 'skill_shortage', etc.
    strength DECIMAL(3,2) NOT NULL, -- 0.00 to 1.00
    description TEXT NOT NULL,
    pattern_data JSONB NOT NULL, -- Actual pattern values
    occurrences JSONB DEFAULT '[]'::jsonb, -- Historical occurrences
    predictive_value DECIMAL(3,2) DEFAULT 0.5,
    recommendations JSONB DEFAULT '[]'::jsonb,
    detected_by_model INTEGER REFERENCES forecasting_models(id),
    first_detected TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Create capacity insights table for AI-generated insights
CREATE TABLE IF NOT EXISTS capacity_insights (
    id SERIAL PRIMARY KEY,
    insight_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    category VARCHAR(50) NOT NULL, -- 'efficiency', 'utilization', 'planning', 'risk'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    impact VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    confidence DECIMAL(3,2) NOT NULL,
    data_points JSONB DEFAULT '[]'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    generated_by_model INTEGER REFERENCES forecasting_models(id),
    related_patterns INTEGER[] DEFAULT ARRAY[]::INTEGER[], -- References to capacity_patterns
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP, -- Insights can have expiration dates
    acknowledged_by UUID REFERENCES employees(id),
    acknowledged_at TIMESTAMP
);

-- Create demand forecasts table for storing prediction results
CREATE TABLE IF NOT EXISTS demand_forecasts (
    id SERIAL PRIMARY KEY,
    forecast_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    skill_name VARCHAR(100) NOT NULL,
    forecast_date DATE NOT NULL,
    predicted_demand DECIMAL(10,2) NOT NULL,
    confidence_level DECIMAL(3,2) NOT NULL,
    upper_bound DECIMAL(10,2),
    lower_bound DECIMAL(10,2),
    model_version INTEGER REFERENCES forecasting_models(id),
    forecast_horizon INTEGER NOT NULL, -- Days ahead
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create capacity forecasts table for capacity predictions
CREATE TABLE IF NOT EXISTS capacity_forecasts (
    id SERIAL PRIMARY KEY,
    forecast_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    forecast_date DATE NOT NULL,
    total_capacity DECIMAL(10,2) NOT NULL,
    available_capacity DECIMAL(10,2) NOT NULL,
    utilization_rate DECIMAL(5,4) NOT NULL,
    confidence_level DECIMAL(3,2) NOT NULL,
    model_version INTEGER REFERENCES forecasting_models(id),
    forecast_horizon INTEGER NOT NULL,
    skill_breakdown JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create anomalies table for detected anomalies
CREATE TABLE IF NOT EXISTS capacity_anomalies (
    id SERIAL PRIMARY KEY,
    anomaly_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    detected_date DATE NOT NULL,
    anomaly_type VARCHAR(50) NOT NULL, -- 'spike', 'drop', 'trend_change', 'seasonal_anomaly'
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high'
    actual_value DECIMAL(10,4) NOT NULL,
    expected_value DECIMAL(10,4) NOT NULL,
    deviation DECIMAL(10,4) NOT NULL,
    explanation TEXT,
    detected_by_model INTEGER REFERENCES forecasting_models(id),
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create historical data cache table for ML training
CREATE TABLE IF NOT EXISTS historical_data_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    data_type VARCHAR(100) NOT NULL, -- 'utilization', 'demand', 'capacity', etc.
    time_window VARCHAR(50) NOT NULL,
    aggregated_data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create scenario results table for storing simulation results
CREATE TABLE IF NOT EXISTS scenario_results (
    id SERIAL PRIMARY KEY,
    scenario_id INTEGER REFERENCES capacity_scenarios(id) ON DELETE CASCADE,
    result_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    analysis_results JSONB NOT NULL,
    performance_metrics JSONB DEFAULT '{}'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    constraint_violations JSONB DEFAULT '[]'::jsonb,
    cost_analysis JSONB DEFAULT '{}'::jsonb,
    risk_assessment JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create pattern occurrences table for tracking pattern instances
CREATE TABLE IF NOT EXISTS pattern_occurrences (
    id SERIAL PRIMARY KEY,
    pattern_id INTEGER REFERENCES capacity_patterns(id) ON DELETE CASCADE,
    occurrence_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    context_data JSONB DEFAULT '{}'::jsonb,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validated BOOLEAN DEFAULT false,
    validated_by UUID REFERENCES employees(id),
    validated_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_capacity_scenarios_status ON capacity_scenarios(status);
CREATE INDEX IF NOT EXISTS idx_capacity_scenarios_created_at ON capacity_scenarios(created_at);
CREATE INDEX IF NOT EXISTS idx_forecasting_models_type ON forecasting_models(type, status);
CREATE INDEX IF NOT EXISTS idx_capacity_patterns_type ON capacity_patterns(type, is_active);
CREATE INDEX IF NOT EXISTS idx_capacity_insights_category ON capacity_insights(category, status);
CREATE INDEX IF NOT EXISTS idx_capacity_insights_impact ON capacity_insights(impact, status);
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_skill_date ON demand_forecasts(skill_name, forecast_date);
CREATE INDEX IF NOT EXISTS idx_capacity_forecasts_date ON capacity_forecasts(forecast_date);
CREATE INDEX IF NOT EXISTS idx_capacity_anomalies_date ON capacity_anomalies(detected_date, resolved);
CREATE INDEX IF NOT EXISTS idx_historical_data_cache_key ON historical_data_cache(cache_key, expires_at);
CREATE INDEX IF NOT EXISTS idx_pattern_occurrences_pattern_dates ON pattern_occurrences(pattern_id, start_date, end_date);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_composite ON demand_forecasts(skill_name, forecast_date, confidence_level);
CREATE INDEX IF NOT EXISTS idx_capacity_insights_composite ON capacity_insights(category, impact, created_at);
CREATE INDEX IF NOT EXISTS idx_capacity_patterns_composite ON capacity_patterns(type, strength, is_active);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_capacity_scenarios_updated_at BEFORE UPDATE ON capacity_scenarios FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_forecasting_models_updated_at BEFORE UPDATE ON forecasting_models FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_capacity_patterns_updated_at BEFORE UPDATE ON capacity_patterns FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create view for active forecasting insights
CREATE OR REPLACE VIEW active_capacity_insights AS
SELECT 
    ci.*,
    fm.name as model_name,
    fm.type as model_type,
    fm.accuracy as model_accuracy
FROM capacity_insights ci
LEFT JOIN forecasting_models fm ON ci.generated_by_model = fm.id
WHERE ci.status = 'active' 
    AND (ci.expires_at IS NULL OR ci.expires_at > CURRENT_TIMESTAMP)
ORDER BY 
    CASE ci.impact 
        WHEN 'critical' THEN 4 
        WHEN 'high' THEN 3 
        WHEN 'medium' THEN 2 
        ELSE 1 
    END DESC,
    ci.confidence DESC,
    ci.created_at DESC;

-- Create view for pattern summary with occurrence counts
CREATE OR REPLACE VIEW pattern_summary AS
SELECT 
    cp.*,
    COUNT(po.id) as total_occurrences,
    COUNT(CASE WHEN po.validated = true THEN 1 END) as validated_occurrences,
    MAX(po.start_date) as last_occurrence_date,
    fm.name as model_name,
    fm.accuracy as model_accuracy
FROM capacity_patterns cp
LEFT JOIN pattern_occurrences po ON cp.id = po.pattern_id
LEFT JOIN forecasting_models fm ON cp.detected_by_model = fm.id
WHERE cp.is_active = true
GROUP BY cp.id, fm.id
ORDER BY cp.strength DESC, total_occurrences DESC;

-- Create view for recent forecasts with model info
CREATE OR REPLACE VIEW recent_forecasts AS
SELECT 
    'demand' as forecast_type,
    df.skill_name as category,
    df.forecast_date,
    df.predicted_demand as predicted_value,
    df.confidence_level,
    df.created_at,
    fm.name as model_name,
    fm.accuracy as model_accuracy
FROM demand_forecasts df
LEFT JOIN forecasting_models fm ON df.model_version = fm.id
WHERE df.forecast_date >= CURRENT_DATE

UNION ALL

SELECT 
    'capacity' as forecast_type,
    'total' as category,
    cf.forecast_date,
    cf.total_capacity as predicted_value,
    cf.confidence_level,
    cf.created_at,
    fm.name as model_name,
    fm.accuracy as model_accuracy
FROM capacity_forecasts cf
LEFT JOIN forecasting_models fm ON cf.model_version = fm.id
WHERE cf.forecast_date >= CURRENT_DATE

ORDER BY forecast_date, created_at DESC;

-- Insert initial forecasting model
INSERT INTO forecasting_models (name, type, version, parameters, training_data_range, status, accuracy, mae, rmse, r2_score) 
VALUES 
    ('ARIMA Base Model', 'arima', '1.0.0', '{"p": 3, "d": 1, "q": 2}'::jsonb, '{"start_date": "2024-01-01", "end_date": "2024-12-31", "size": 1000}'::jsonb, 'active', 0.8500, 0.1200, 0.1800, 0.8700),
    ('Neural Network Ensemble', 'ensemble', '1.0.0', '{"models": ["arima", "lstm", "cnn"], "weights": [0.3, 0.4, 0.3]}'::jsonb, '{"start_date": "2024-01-01", "end_date": "2024-12-31", "size": 1500}'::jsonb, 'active', 0.8800, 0.1050, 0.1650, 0.9100)
ON CONFLICT DO NOTHING;

-- Insert sample capacity patterns (for demonstration)
INSERT INTO capacity_patterns (type, strength, description, pattern_data, detected_by_model, predictive_value, recommendations)
SELECT 
    'seasonal_demand', 
    0.82, 
    'Q4 demand spike for frontend development skills', 
    '{"pattern": [0.7, 0.8, 0.9, 1.2, 1.4, 1.3, 1.1, 0.9], "frequency": 90}'::jsonb,
    fm.id,
    0.75,
    '["Plan additional hiring in Q3", "Cross-train backend developers", "Consider contractor support"]'::jsonb
FROM forecasting_models fm 
WHERE fm.name = 'Neural Network Ensemble'
ON CONFLICT DO NOTHING;

COMMENT ON TABLE capacity_scenarios IS 'What-if scenarios for capacity planning with AI analysis';
COMMENT ON TABLE forecasting_models IS 'ML models used for capacity forecasting and pattern recognition';
COMMENT ON TABLE capacity_patterns IS 'Recognized patterns in capacity and demand data';
COMMENT ON TABLE capacity_insights IS 'AI-generated insights and recommendations for capacity optimization';
COMMENT ON TABLE demand_forecasts IS 'Predicted demand for skills and resources';
COMMENT ON TABLE capacity_forecasts IS 'Predicted overall capacity and utilization';
COMMENT ON TABLE capacity_anomalies IS 'Detected anomalies in capacity utilization patterns';
COMMENT ON TABLE historical_data_cache IS 'Cached aggregated data for ML model training and analysis';
COMMENT ON TABLE scenario_results IS 'Results and analysis from what-if scenario simulations';
COMMENT ON TABLE pattern_occurrences IS 'Individual instances of recognized capacity patterns';

-- Grant permissions (commented out - app_user role does not exist)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON capacity_scenarios TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON forecasting_models TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON capacity_patterns TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON capacity_insights TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON demand_forecasts TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON capacity_forecasts TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON capacity_anomalies TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON historical_data_cache TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON scenario_results TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON pattern_occurrences TO app_user;

-- GRANT SELECT ON active_capacity_insights TO app_user;
-- GRANT SELECT ON pattern_summary TO app_user;
-- GRANT SELECT ON recent_forecasts TO app_user;

-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
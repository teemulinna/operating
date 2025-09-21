-- Phase 4: Intelligent Features - Forecasting and Predictive Analytics
-- Migration 022: Resource Forecasting and Historical Pattern Analysis
-- Description: Creates tables for resource demand forecasting, capacity predictions, and historical pattern analysis

-- Time series data for resource forecasting
CREATE TABLE IF NOT EXISTS resource_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forecast_type VARCHAR(50) NOT NULL CHECK (forecast_type IN ('demand', 'capacity', 'utilization', 'skills_gap', 'attrition')),
    resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('employees', 'skills', 'projects', 'departments', 'roles')),
    resource_id UUID, -- Can reference employees, skills, departments, etc.
    forecast_horizon VARCHAR(20) NOT NULL CHECK (forecast_horizon IN ('weekly', 'monthly', 'quarterly', 'yearly')),
    forecast_date TIMESTAMP NOT NULL,
    target_date TIMESTAMP NOT NULL,
    
    -- Prediction values
    predicted_value DECIMAL(15,4) NOT NULL,
    lower_bound DECIMAL(15,4),
    upper_bound DECIMAL(15,4),
    confidence_score DECIMAL(5,4) DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    
    -- Model metadata
    model_type VARCHAR(50) NOT NULL DEFAULT 'linear_regression',
    model_version VARCHAR(20) DEFAULT '1.0',
    training_data_size INTEGER,
    feature_importance JSONB,
    
    -- Validation metrics
    accuracy_score DECIMAL(5,4),
    mae DECIMAL(15,4), -- Mean Absolute Error
    rmse DECIMAL(15,4), -- Root Mean Square Error
    mape DECIMAL(5,4), -- Mean Absolute Percentage Error
    
    -- Context and metadata
    forecast_context JSONB, -- Market conditions, seasonal factors, etc.
    assumptions TEXT,
    risk_factors JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES employees(id)
);

-- Historical patterns and trend analysis
CREATE TABLE IF NOT EXISTS historical_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_type VARCHAR(50) NOT NULL CHECK (pattern_type IN ('seasonal', 'cyclical', 'trend', 'anomaly', 'correlation')),
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('employee', 'skill', 'project', 'department', 'workload')),
    entity_id UUID,
    
    -- Pattern characteristics
    pattern_name VARCHAR(100) NOT NULL,
    description TEXT,
    frequency VARCHAR(20), -- daily, weekly, monthly, quarterly, yearly
    amplitude DECIMAL(10,4), -- Strength of the pattern
    phase_offset INTEGER, -- Phase shift in time units
    
    -- Time range
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    detection_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Pattern data
    pattern_data JSONB NOT NULL, -- Raw pattern data points
    statistical_measures JSONB, -- Mean, std dev, correlation coefficients, etc.
    significance_score DECIMAL(5,4) DEFAULT 0.5,
    
    -- Validation
    is_validated BOOLEAN DEFAULT false,
    validation_method VARCHAR(100),
    validation_score DECIMAL(5,4),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Demand predictions for projects and resources
CREATE TABLE IF NOT EXISTS demand_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    demand_type VARCHAR(50) NOT NULL CHECK (demand_type IN ('resource_count', 'skill_requirement', 'budget', 'timeline', 'capacity')),
    resource_type VARCHAR(50), -- skill, role, department, etc.
    resource_identifier UUID, -- ID of the specific resource
    
    -- Prediction timeline
    prediction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    
    -- Demand quantities
    quantity_needed DECIMAL(10,2) NOT NULL,
    quantity_unit VARCHAR(50) DEFAULT 'FTE', -- FTE, hours, days, percentage
    urgency_score DECIMAL(5,2) DEFAULT 1.0 CHECK (urgency_score >= 0 AND urgency_score <= 10),
    
    -- Confidence and reliability
    confidence_level DECIMAL(5,4) DEFAULT 0.5 CHECK (confidence_level >= 0 AND confidence_level <= 1),
    prediction_accuracy DECIMAL(5,4), -- Actual vs predicted accuracy when available
    
    -- Context and factors
    business_drivers JSONB, -- What's driving this demand
    external_factors JSONB, -- Market conditions, client requirements, etc.
    seasonal_adjustments JSONB,
    
    -- Dependencies and constraints
    dependency_projects JSONB, -- Other projects this depends on
    resource_constraints JSONB, -- Known limitations
    
    -- Model information
    prediction_model VARCHAR(50) DEFAULT 'historical_average',
    model_parameters JSONB,
    training_period_start TIMESTAMP,
    training_period_end TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES employees(id)
);

-- Capacity forecasting for teams and individuals
CREATE TABLE IF NOT EXISTS capacity_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id),
    
    -- Forecast period
    forecast_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    
    -- Capacity metrics
    available_hours DECIMAL(8,2) NOT NULL,
    committed_hours DECIMAL(8,2) DEFAULT 0,
    projected_utilization DECIMAL(5,4) CHECK (projected_utilization >= 0 AND projected_utilization <= 2), -- Allow for overtime
    
    -- Factors affecting capacity
    vacation_days INTEGER DEFAULT 0,
    training_hours DECIMAL(6,2) DEFAULT 0,
    meeting_overhead DECIMAL(5,4) DEFAULT 0.1, -- Percentage of time in meetings
    context_switching_overhead DECIMAL(5,4) DEFAULT 0.05,
    
    -- Skill-specific capacity
    skill_capacities JSONB, -- Breakdown by skill areas
    
    -- Confidence and validation
    confidence_score DECIMAL(5,4) DEFAULT 0.5,
    historical_accuracy DECIMAL(5,4),
    
    -- Adjustment factors
    performance_multiplier DECIMAL(5,4) DEFAULT 1.0,
    learning_curve_factor DECIMAL(5,4) DEFAULT 1.0,
    motivation_factor DECIMAL(5,4) DEFAULT 1.0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Market trends and external data
CREATE TABLE IF NOT EXISTS market_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trend_category VARCHAR(50) NOT NULL CHECK (trend_category IN ('technology', 'industry', 'skills', 'compensation', 'demand')),
    trend_name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Geographic and industry scope
    region VARCHAR(100),
    industry_sector VARCHAR(100),
    
    -- Trend data
    trend_direction VARCHAR(20) CHECK (trend_direction IN ('increasing', 'decreasing', 'stable', 'volatile', 'cyclical')),
    trend_strength DECIMAL(5,4) DEFAULT 1.0,
    trend_velocity DECIMAL(10,6), -- Rate of change
    
    -- Time series data
    data_points JSONB NOT NULL, -- Historical data points
    forecast_points JSONB, -- Future predictions
    
    -- Impact assessment
    business_impact DECIMAL(5,2) DEFAULT 1.0,
    relevance_score DECIMAL(5,4) DEFAULT 0.5,
    
    -- Data sources
    data_sources JSONB NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    next_update TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scenario planning and what-if analysis
CREATE TABLE IF NOT EXISTS forecast_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_name VARCHAR(100) NOT NULL,
    description TEXT,
    scenario_type VARCHAR(50) NOT NULL CHECK (scenario_type IN ('optimistic', 'pessimistic', 'baseline', 'stress_test', 'custom')),
    
    -- Scenario parameters
    probability DECIMAL(5,4) DEFAULT 0.33 CHECK (probability >= 0 AND probability <= 1),
    time_horizon_months INTEGER NOT NULL,
    
    -- Variable adjustments
    growth_rate_adjustment DECIMAL(6,4) DEFAULT 0, -- +/- percentage points
    demand_multiplier DECIMAL(5,4) DEFAULT 1.0,
    capacity_multiplier DECIMAL(5,4) DEFAULT 1.0,
    attrition_rate_adjustment DECIMAL(6,4) DEFAULT 0,
    
    -- Scenario-specific assumptions
    assumptions JSONB NOT NULL,
    external_factors JSONB,
    
    -- Results storage
    forecast_results JSONB,
    risk_assessment JSONB,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES employees(id)
);

-- Link forecasts to scenarios
CREATE TABLE IF NOT EXISTS scenario_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id UUID NOT NULL REFERENCES forecast_scenarios(id) ON DELETE CASCADE,
    forecast_id UUID NOT NULL REFERENCES resource_forecasts(id) ON DELETE CASCADE,
    adjustment_factor DECIMAL(5,4) DEFAULT 1.0,
    scenario_specific_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(scenario_id, forecast_id)
);

-- Comprehensive indexes for performance
CREATE INDEX IF NOT EXISTS idx_resource_forecasts_type_date ON resource_forecasts(forecast_type, forecast_date);
CREATE INDEX IF NOT EXISTS idx_resource_forecasts_resource ON resource_forecasts(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_forecasts_target_date ON resource_forecasts(target_date);
CREATE INDEX IF NOT EXISTS idx_resource_forecasts_confidence ON resource_forecasts(confidence_score DESC);

CREATE INDEX IF NOT EXISTS idx_historical_patterns_type ON historical_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_historical_patterns_entity ON historical_patterns(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_historical_patterns_detection_date ON historical_patterns(detection_date);
CREATE INDEX IF NOT EXISTS idx_historical_patterns_significance ON historical_patterns(significance_score DESC);

CREATE INDEX IF NOT EXISTS idx_demand_predictions_project ON demand_predictions(project_id);
CREATE INDEX IF NOT EXISTS idx_demand_predictions_resource ON demand_predictions(resource_type, resource_identifier);
CREATE INDEX IF NOT EXISTS idx_demand_predictions_dates ON demand_predictions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_demand_predictions_urgency ON demand_predictions(urgency_score DESC);

CREATE INDEX IF NOT EXISTS idx_capacity_forecasts_employee ON capacity_forecasts(employee_id);
CREATE INDEX IF NOT EXISTS idx_capacity_forecasts_department ON capacity_forecasts(department_id);
CREATE INDEX IF NOT EXISTS idx_capacity_forecasts_period ON capacity_forecasts(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_capacity_forecasts_utilization ON capacity_forecasts(projected_utilization);

CREATE INDEX IF NOT EXISTS idx_market_trends_category ON market_trends(trend_category);
CREATE INDEX IF NOT EXISTS idx_market_trends_region ON market_trends(region);
CREATE INDEX IF NOT EXISTS idx_market_trends_impact ON market_trends(business_impact DESC);

CREATE INDEX IF NOT EXISTS idx_forecast_scenarios_type ON forecast_scenarios(scenario_type);
CREATE INDEX IF NOT EXISTS idx_forecast_scenarios_probability ON forecast_scenarios(probability DESC);

-- Partitioning for time-series data (optional, for high-volume deployments)
-- CREATE TABLE resource_forecasts_y2024 PARTITION OF resource_forecasts 
-- FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_resource_forecasts_updated_at 
    BEFORE UPDATE ON resource_forecasts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_historical_patterns_updated_at 
    BEFORE UPDATE ON historical_patterns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_demand_predictions_updated_at 
    BEFORE UPDATE ON demand_predictions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_capacity_forecasts_updated_at 
    BEFORE UPDATE ON capacity_forecasts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_market_trends_updated_at 
    BEFORE UPDATE ON market_trends
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forecast_scenarios_updated_at 
    BEFORE UPDATE ON forecast_scenarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Materialized view for quick forecast summaries
CREATE MATERIALIZED VIEW IF NOT EXISTS forecast_summary AS
SELECT 
    forecast_type,
    resource_type,
    COUNT(*) as total_forecasts,
    AVG(confidence_score) as avg_confidence,
    MIN(target_date) as earliest_forecast,
    MAX(target_date) as latest_forecast,
    AVG(accuracy_score) as avg_accuracy
FROM resource_forecasts 
WHERE forecast_date >= CURRENT_TIMESTAMP - INTERVAL '6 months'
GROUP BY forecast_type, resource_type;

-- Refresh schedule for materialized view (requires pg_cron extension)
-- SELECT cron.schedule('refresh-forecast-summary', '0 2 * * *', 'REFRESH MATERIALIZED VIEW forecast_summary;');

COMMENT ON TABLE resource_forecasts IS 'Time series forecasts for resources, capacity, and demand';
COMMENT ON TABLE historical_patterns IS 'Detected patterns in historical data for trend analysis';
COMMENT ON TABLE demand_predictions IS 'Project-specific resource demand predictions';
COMMENT ON TABLE capacity_forecasts IS 'Individual and team capacity forecasting';
COMMENT ON TABLE market_trends IS 'External market trends affecting resource planning';
COMMENT ON TABLE forecast_scenarios IS 'Scenario planning and what-if analysis configurations';
COMMENT ON MATERIALIZED VIEW forecast_summary IS 'Quick summary statistics for forecasting performance';
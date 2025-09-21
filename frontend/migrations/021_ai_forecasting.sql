-- Migration: 021_ai_forecasting.sql
-- Description: Create AI-powered capacity forecasting and demand prediction system
-- Author: Backend API Developer Agent
-- Date: 2025-09-07
-- Prerequisites: 001_initial_schema.sql, 020_ai_skill_taxonomy.sql

BEGIN;

-- Capacity forecasting table for AI-driven predictions
CREATE TABLE capacity_forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  
  -- Capacity predictions
  predicted_capacity_hours DECIMAL(6,2) NOT NULL DEFAULT 0.0 CHECK (predicted_capacity_hours >= 0),
  base_capacity_hours DECIMAL(6,2) NOT NULL DEFAULT 40.0 CHECK (base_capacity_hours >= 0),
  availability_factor DECIMAL(4,3) DEFAULT 1.0 CHECK (availability_factor BETWEEN 0.0 AND 1.0),
  
  -- AI confidence and modeling
  confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.7 CHECK (confidence_score BETWEEN 0.0 AND 1.0),
  prediction_accuracy DECIMAL(3,2) DEFAULT 0.0 CHECK (prediction_accuracy BETWEEN 0.0 AND 1.0),
  model_version VARCHAR(20) DEFAULT 'v1.0',
  
  -- Influencing factors (stored as JSON for flexibility)
  seasonal_factors JSONB DEFAULT '{}', -- holidays, vacation patterns, etc.
  project_factors JSONB DEFAULT '{}', -- ongoing projects, deadlines
  personal_factors JSONB DEFAULT '{}', -- training, meetings, personal time off
  historical_patterns JSONB DEFAULT '{}', -- past capacity patterns
  
  -- Forecast metadata
  forecast_horizon_days INTEGER DEFAULT 30 CHECK (forecast_horizon_days > 0),
  forecast_type VARCHAR(20) DEFAULT 'rolling' CHECK (forecast_type IN ('rolling', 'static', 'scenario_based')),
  created_by_model VARCHAR(50) DEFAULT 'ensemble_v1',
  
  -- Validation and feedback
  actual_capacity_hours DECIMAL(6,2) DEFAULT 0.0,
  variance_percentage DECIMAL(5,2) DEFAULT 0.0,
  feedback_score INTEGER DEFAULT 0 CHECK (feedback_score BETWEEN -5 AND 5),
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  
  -- Constraints
  UNIQUE(employee_id, forecast_date),
  CONSTRAINT capacity_forecasts_reasonable_capacity CHECK (predicted_capacity_hours <= 80)
);

-- Demand predictions for project resource needs
CREATE TABLE demand_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL, -- Will reference projects table
  forecast_date DATE NOT NULL,
  
  -- Demand predictions
  required_hours DECIMAL(8,2) NOT NULL DEFAULT 0.0 CHECK (required_hours >= 0),
  peak_demand_hours DECIMAL(8,2) DEFAULT 0.0 CHECK (peak_demand_hours >= 0),
  skill_type VARCHAR(100), -- Primary skill category required
  role_type VARCHAR(100), -- Primary role type needed
  
  -- AI predictions and confidence
  demand_confidence DECIMAL(3,2) DEFAULT 0.7 CHECK (demand_confidence BETWEEN 0.0 AND 1.0),
  urgency_score DECIMAL(3,2) DEFAULT 0.5 CHECK (urgency_score BETWEEN 0.0 AND 1.0),
  complexity_multiplier DECIMAL(3,2) DEFAULT 1.0 CHECK (complexity_multiplier BETWEEN 0.1 AND 5.0),
  
  -- Skill distribution predictions
  skill_requirements JSONB DEFAULT '{}', -- Detailed skill breakdown with hours
  experience_requirements JSONB DEFAULT '{}', -- Experience level requirements
  team_size_optimal INTEGER DEFAULT 1 CHECK (team_size_optimal > 0),
  team_size_range JSONB DEFAULT '{"min": 1, "max": 10}',
  
  -- Timeline predictions
  estimated_start_date DATE,
  estimated_end_date DATE,
  critical_milestone_dates JSONB DEFAULT '[]',
  buffer_percentage DECIMAL(4,2) DEFAULT 20.0 CHECK (buffer_percentage BETWEEN 0.0 AND 100.0),
  
  -- Risk assessments
  resource_risk_level VARCHAR(20) DEFAULT 'medium' CHECK (resource_risk_level IN ('low', 'medium', 'high', 'critical')),
  skill_availability_risk DECIMAL(3,2) DEFAULT 0.5 CHECK (skill_availability_risk BETWEEN 0.0 AND 1.0),
  timeline_risk DECIMAL(3,2) DEFAULT 0.5 CHECK (timeline_risk BETWEEN 0.0 AND 1.0),
  
  -- Model metadata
  prediction_model VARCHAR(50) DEFAULT 'demand_forecast_v1',
  model_accuracy DECIMAL(3,2) DEFAULT 0.0 CHECK (model_accuracy BETWEEN 0.0 AND 1.0),
  last_training_date TIMESTAMPTZ,
  
  -- Validation
  actual_hours DECIMAL(8,2) DEFAULT 0.0,
  actual_start_date DATE,
  actual_end_date DATE,
  prediction_variance DECIMAL(5,2) DEFAULT 0.0,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  
  -- Constraints
  UNIQUE(project_id, forecast_date),
  CONSTRAINT demand_predictions_reasonable_timeline CHECK (estimated_end_date IS NULL OR estimated_start_date IS NULL OR estimated_end_date >= estimated_start_date)
);

-- Historical patterns for AI learning and trend analysis
CREATE TABLE historical_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pattern_type VARCHAR(50) NOT NULL CHECK (pattern_type IN (
    'capacity_seasonal', 'demand_seasonal', 'skill_trend', 'project_lifecycle', 
    'team_performance', 'resource_utilization', 'market_demand', 'technology_adoption',
    'employee_growth', 'project_complexity'
  )),
  
  -- Pattern identification
  pattern_name VARCHAR(200) NOT NULL,
  description TEXT,
  confidence_level DECIMAL(3,2) DEFAULT 0.7 CHECK (confidence_level BETWEEN 0.0 AND 1.0),
  
  -- Pattern data (flexible JSON structure)
  pattern_data JSONB NOT NULL DEFAULT '{}',
  statistical_measures JSONB DEFAULT '{}', -- mean, std, correlations, etc.
  trend_analysis JSONB DEFAULT '{}', -- growth rates, cycles, anomalies
  
  -- Time-based pattern attributes
  seasonality_detected BOOLEAN DEFAULT false,
  cycle_length_days INTEGER DEFAULT 0,
  trend_direction VARCHAR(20) DEFAULT 'stable' CHECK (trend_direction IN ('declining', 'stable', 'growing', 'volatile')),
  
  -- Pattern validity and accuracy
  pattern_strength DECIMAL(3,2) DEFAULT 0.5 CHECK (pattern_strength BETWEEN 0.0 AND 1.0),
  sample_size INTEGER DEFAULT 0,
  date_range_start DATE,
  date_range_end DATE,
  last_validation_date TIMESTAMPTZ,
  validation_accuracy DECIMAL(3,2) DEFAULT 0.0 CHECK (validation_accuracy BETWEEN 0.0 AND 1.0),
  
  -- Business impact
  business_impact_score DECIMAL(3,2) DEFAULT 0.5 CHECK (business_impact_score BETWEEN 0.0 AND 1.0),
  actionability_score DECIMAL(3,2) DEFAULT 0.5 CHECK (actionability_score BETWEEN 0.0 AND 1.0),
  
  -- Model and algorithm metadata
  algorithm_used VARCHAR(100) DEFAULT 'statistical_analysis',
  model_parameters JSONB DEFAULT '{}',
  feature_importance JSONB DEFAULT '{}',
  
  -- Status and lifecycle
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'under_review', 'archived')),
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  
  -- Constraints
  CONSTRAINT historical_patterns_valid_date_range CHECK (date_range_end IS NULL OR date_range_start IS NULL OR date_range_end >= date_range_start)
);

-- AI model performance tracking
CREATE TABLE ai_model_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_name VARCHAR(100) NOT NULL,
  model_version VARCHAR(50) NOT NULL,
  model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('capacity_forecast', 'demand_prediction', 'skill_matching', 'optimization', 'classification')),
  
  -- Performance metrics
  accuracy_score DECIMAL(5,4) DEFAULT 0.0 CHECK (accuracy_score BETWEEN 0.0 AND 1.0),
  precision_score DECIMAL(5,4) DEFAULT 0.0 CHECK (precision_score BETWEEN 0.0 AND 1.0),
  recall_score DECIMAL(5,4) DEFAULT 0.0 CHECK (recall_score BETWEEN 0.0 AND 1.0),
  f1_score DECIMAL(5,4) DEFAULT 0.0 CHECK (f1_score BETWEEN 0.0 AND 1.0),
  mae_score DECIMAL(8,4) DEFAULT 0.0, -- Mean Absolute Error
  rmse_score DECIMAL(8,4) DEFAULT 0.0, -- Root Mean Square Error
  
  -- Training and validation data
  training_data_size INTEGER DEFAULT 0,
  validation_data_size INTEGER DEFAULT 0,
  test_data_size INTEGER DEFAULT 0,
  cross_validation_scores JSONB DEFAULT '[]',
  
  -- Model configuration
  hyperparameters JSONB DEFAULT '{}',
  feature_set JSONB DEFAULT '[]',
  training_duration_minutes INTEGER DEFAULT 0,
  
  -- Deployment and usage
  deployment_date TIMESTAMPTZ,
  last_retrained_at TIMESTAMPTZ,
  prediction_count INTEGER DEFAULT 0,
  active_usage BOOLEAN DEFAULT true,
  
  -- Business metrics
  business_value_score DECIMAL(3,2) DEFAULT 0.5 CHECK (business_value_score BETWEEN 0.0 AND 1.0),
  cost_savings_estimated DECIMAL(10,2) DEFAULT 0.0,
  user_satisfaction_score DECIMAL(3,2) DEFAULT 0.0 CHECK (user_satisfaction_score BETWEEN 0.0 AND 5.0),
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  
  -- Constraints
  UNIQUE(model_name, model_version)
);

-- Forecast scenarios for what-if analysis
CREATE TABLE forecast_scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_name VARCHAR(200) NOT NULL,
  description TEXT,
  scenario_type VARCHAR(50) DEFAULT 'hypothetical' CHECK (scenario_type IN ('baseline', 'optimistic', 'pessimistic', 'hypothetical', 'stress_test')),
  
  -- Scenario parameters
  scenario_parameters JSONB NOT NULL DEFAULT '{}',
  assumption_changes JSONB DEFAULT '{}',
  external_factors JSONB DEFAULT '{}',
  
  -- Time boundaries
  scenario_start_date DATE NOT NULL,
  scenario_end_date DATE NOT NULL,
  
  -- Results and outcomes
  capacity_impact JSONB DEFAULT '{}',
  demand_impact JSONB DEFAULT '{}',
  resource_allocation_changes JSONB DEFAULT '{}',
  
  -- Scenario analysis
  probability_score DECIMAL(3,2) DEFAULT 0.5 CHECK (probability_score BETWEEN 0.0 AND 1.0),
  impact_severity VARCHAR(20) DEFAULT 'medium' CHECK (impact_severity IN ('low', 'medium', 'high', 'critical')),
  mitigation_strategies JSONB DEFAULT '[]',
  
  -- Status and approval
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'active', 'completed', 'archived')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  
  -- Constraints
  CONSTRAINT forecast_scenarios_valid_timeline CHECK (scenario_end_date >= scenario_start_date)
);

-- Create comprehensive indexes for forecasting performance
CREATE INDEX idx_capacity_forecasts_employee_date ON capacity_forecasts(employee_id, forecast_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_capacity_forecasts_date ON capacity_forecasts(forecast_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_capacity_forecasts_confidence ON capacity_forecasts(confidence_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_capacity_forecasts_horizon ON capacity_forecasts(forecast_horizon_days) WHERE deleted_at IS NULL;
CREATE INDEX idx_capacity_forecasts_type ON capacity_forecasts(forecast_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_capacity_forecasts_model ON capacity_forecasts(created_by_model) WHERE deleted_at IS NULL;
CREATE INDEX idx_capacity_forecasts_accuracy ON capacity_forecasts(prediction_accuracy DESC) WHERE deleted_at IS NULL;

CREATE INDEX idx_demand_predictions_project_date ON demand_predictions(project_id, forecast_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_demand_predictions_date ON demand_predictions(forecast_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_demand_predictions_skill ON demand_predictions(skill_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_demand_predictions_urgency ON demand_predictions(urgency_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_demand_predictions_risk ON demand_predictions(resource_risk_level) WHERE deleted_at IS NULL;
CREATE INDEX idx_demand_predictions_timeline ON demand_predictions(estimated_start_date, estimated_end_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_demand_predictions_requirements ON demand_predictions USING GIN(skill_requirements) WHERE deleted_at IS NULL;

CREATE INDEX idx_historical_patterns_type ON historical_patterns(pattern_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_historical_patterns_confidence ON historical_patterns(confidence_level DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_historical_patterns_strength ON historical_patterns(pattern_strength DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_historical_patterns_status ON historical_patterns(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_historical_patterns_date_range ON historical_patterns(date_range_start, date_range_end) WHERE deleted_at IS NULL;
CREATE INDEX idx_historical_patterns_business_impact ON historical_patterns(business_impact_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_historical_patterns_data ON historical_patterns USING GIN(pattern_data) WHERE deleted_at IS NULL;

CREATE INDEX idx_ai_model_performance_type ON ai_model_performance(model_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_model_performance_accuracy ON ai_model_performance(accuracy_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_model_performance_active ON ai_model_performance(active_usage) WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_model_performance_deployment ON ai_model_performance(deployment_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_model_performance_business_value ON ai_model_performance(business_value_score DESC) WHERE deleted_at IS NULL;

CREATE INDEX idx_forecast_scenarios_timeline ON forecast_scenarios(scenario_start_date, scenario_end_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_forecast_scenarios_type ON forecast_scenarios(scenario_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_forecast_scenarios_status ON forecast_scenarios(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_forecast_scenarios_probability ON forecast_scenarios(probability_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_forecast_scenarios_impact ON forecast_scenarios(impact_severity) WHERE deleted_at IS NULL;

-- Create triggers for updated_at columns
CREATE TRIGGER trigger_capacity_forecasts_updated_at
  BEFORE UPDATE ON capacity_forecasts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_demand_predictions_updated_at
  BEFORE UPDATE ON demand_predictions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_historical_patterns_updated_at
  BEFORE UPDATE ON historical_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_ai_model_performance_updated_at
  BEFORE UPDATE ON ai_model_performance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_forecast_scenarios_updated_at
  BEFORE UPDATE ON forecast_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate forecast accuracy automatically
CREATE OR REPLACE FUNCTION calculate_forecast_accuracy()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate accuracy when actual capacity is set
  IF NEW.actual_capacity_hours IS NOT NULL AND NEW.actual_capacity_hours > 0 THEN
    NEW.variance_percentage = ABS(NEW.predicted_capacity_hours - NEW.actual_capacity_hours) / NEW.actual_capacity_hours * 100;
    NEW.prediction_accuracy = GREATEST(0.0, 1.0 - (NEW.variance_percentage / 100.0));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic accuracy calculation
CREATE TRIGGER trigger_capacity_forecasts_accuracy
  BEFORE INSERT OR UPDATE ON capacity_forecasts
  FOR EACH ROW
  EXECUTE FUNCTION calculate_forecast_accuracy();

-- Function to calculate demand prediction variance
CREATE OR REPLACE FUNCTION calculate_demand_variance()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate variance when actual hours is set
  IF NEW.actual_hours IS NOT NULL AND NEW.actual_hours > 0 THEN
    NEW.prediction_variance = (NEW.required_hours - NEW.actual_hours) / NEW.actual_hours * 100;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic demand variance calculation
CREATE TRIGGER trigger_demand_predictions_variance
  BEFORE INSERT OR UPDATE ON demand_predictions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_demand_variance();

-- Insert default AI model performance baselines
INSERT INTO ai_model_performance (model_name, model_version, model_type, accuracy_score, deployment_date) VALUES
('capacity_ensemble_v1', '1.0.0', 'capacity_forecast', 0.75, NOW()),
('demand_neural_v1', '1.0.0', 'demand_prediction', 0.68, NOW()),
('skill_matcher_v1', '1.0.0', 'skill_matching', 0.82, NOW()),
('resource_optimizer_v1', '1.0.0', 'optimization', 0.71, NOW());

-- Insert common historical pattern types for initial analysis
INSERT INTO historical_patterns (pattern_type, pattern_name, description, pattern_data, confidence_level) VALUES
('capacity_seasonal', 'Holiday Capacity Drop', 'Reduced capacity during holiday periods', '{"reduction_percentage": 25, "affected_months": [11, 12, 1]}', 0.85),
('demand_seasonal', 'Q4 Project Rush', 'Increased project demand in Q4', '{"increase_percentage": 40, "peak_months": [10, 11, 12]}', 0.78),
('skill_trend', 'Cloud Skills Growth', 'Growing demand for cloud platform skills', '{"growth_rate_monthly": 5.2, "technologies": ["AWS", "Azure", "GCP"]}', 0.91),
('project_lifecycle', 'Standard Development Cycle', 'Typical project resource allocation pattern', '{"phases": ["planning", "development", "testing", "deployment"], "duration_weeks": [2, 8, 4, 2]}', 0.73);

COMMIT;
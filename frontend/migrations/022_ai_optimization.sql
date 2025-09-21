-- Migration: 022_ai_optimization.sql
-- Description: Create AI-powered optimization system for resource allocation and conflict resolution
-- Author: Backend API Developer Agent
-- Date: 2025-09-07
-- Prerequisites: 001_initial_schema.sql, 020_ai_skill_taxonomy.sql, 021_ai_forecasting.sql

BEGIN;

-- Optimization runs table for tracking AI optimization sessions
CREATE TABLE optimization_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  optimization_type VARCHAR(50) NOT NULL CHECK (optimization_type IN (
    'resource_allocation', 'skill_matching', 'capacity_balancing', 'cost_optimization',
    'timeline_optimization', 'team_formation', 'workload_distribution', 'conflict_resolution'
  )),
  
  -- Run identification and metadata
  run_name VARCHAR(200),
  description TEXT,
  initiated_by VARCHAR(50) DEFAULT 'system' CHECK (initiated_by IN ('system', 'user', 'scheduler', 'api')),
  
  -- Input parameters and scope
  input_parameters JSONB NOT NULL DEFAULT '{}',
  optimization_scope JSONB DEFAULT '{}', -- projects, employees, skills, timeframe
  constraints JSONB DEFAULT '{}', -- business constraints, availability, budget
  objectives JSONB DEFAULT '{}', -- primary and secondary objectives with weights
  
  -- Algorithm and model information
  algorithm_used VARCHAR(100) DEFAULT 'genetic_algorithm_v1',
  model_version VARCHAR(50) DEFAULT '1.0.0',
  optimization_settings JSONB DEFAULT '{}', -- algorithm-specific parameters
  
  -- Execution metrics
  execution_start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  execution_end_time TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  iterations_completed INTEGER DEFAULT 0,
  convergence_achieved BOOLEAN DEFAULT false,
  
  -- Results and outcomes
  results JSONB NOT NULL DEFAULT '{}',
  optimization_score DECIMAL(8,4) DEFAULT 0.0 CHECK (optimization_score >= 0),
  improvement_percentage DECIMAL(5,2) DEFAULT 0.0,
  confidence_level DECIMAL(3,2) DEFAULT 0.7 CHECK (confidence_level BETWEEN 0.0 AND 1.0),
  
  -- Solution quality metrics
  feasibility_score DECIMAL(3,2) DEFAULT 1.0 CHECK (feasibility_score BETWEEN 0.0 AND 1.0),
  robustness_score DECIMAL(3,2) DEFAULT 0.5 CHECK (robustness_score BETWEEN 0.0 AND 1.0),
  complexity_score DECIMAL(3,2) DEFAULT 0.5 CHECK (complexity_score BETWEEN 0.0 AND 1.0),
  
  -- Status and lifecycle
  status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled', 'timeout')),
  error_message TEXT,
  warning_messages JSONB DEFAULT '[]',
  
  -- Business impact
  estimated_cost_savings DECIMAL(12,2) DEFAULT 0.0,
  estimated_efficiency_gain DECIMAL(5,2) DEFAULT 0.0,
  risk_assessment JSONB DEFAULT '{}',
  
  -- Implementation tracking
  implementation_status VARCHAR(20) DEFAULT 'pending' CHECK (implementation_status IN ('pending', 'approved', 'rejected', 'implemented', 'partially_implemented')),
  implemented_at TIMESTAMPTZ,
  implementation_notes TEXT,
  actual_impact JSONB DEFAULT '{}',
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

-- Conflict detection and resolution system
CREATE TABLE conflict_resolutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conflict_id UUID NOT NULL, -- Could reference a conflicts table
  conflict_type VARCHAR(50) NOT NULL CHECK (conflict_type IN (
    'resource_overallocation', 'skill_mismatch', 'timeline_overlap', 'budget_exceeded',
    'capacity_shortage', 'priority_conflict', 'dependency_violation', 'availability_clash'
  )),
  
  -- Conflict details
  conflict_description TEXT NOT NULL,
  severity_level VARCHAR(20) DEFAULT 'medium' CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
  affected_entities JSONB DEFAULT '{}', -- employees, projects, resources involved
  
  -- Detection metadata
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  detection_method VARCHAR(50) DEFAULT 'automated' CHECK (detection_method IN ('automated', 'manual', 'reported', 'predicted')),
  detection_confidence DECIMAL(3,2) DEFAULT 0.8 CHECK (detection_confidence BETWEEN 0.0 AND 1.0),
  
  -- Resolution strategy
  strategy VARCHAR(100) NOT NULL CHECK (strategy IN (
    'resource_reallocation', 'timeline_adjustment', 'skill_substitution', 'capacity_increase',
    'priority_rebalancing', 'scope_reduction', 'budget_adjustment', 'outsourcing', 'escalation'
  )),
  resolution_approach JSONB DEFAULT '{}', -- detailed approach and steps
  alternative_strategies JSONB DEFAULT '[]', -- backup options
  
  -- Resolution execution
  resolution_start_time TIMESTAMPTZ,
  resolution_end_time TIMESTAMPTZ,
  execution_steps JSONB DEFAULT '[]',
  resources_involved JSONB DEFAULT '{}',
  
  -- Outcome assessment
  outcome VARCHAR(20) DEFAULT 'pending' CHECK (outcome IN ('pending', 'successful', 'partial', 'failed', 'escalated')),
  success_metrics JSONB DEFAULT '{}',
  resolution_effectiveness DECIMAL(3,2) DEFAULT 0.0 CHECK (resolution_effectiveness BETWEEN 0.0 AND 1.0),
  
  -- Impact tracking
  cost_impact DECIMAL(10,2) DEFAULT 0.0,
  timeline_impact_days INTEGER DEFAULT 0,
  quality_impact_score DECIMAL(3,2) DEFAULT 0.0 CHECK (quality_impact_score BETWEEN -1.0 AND 1.0),
  stakeholder_satisfaction DECIMAL(3,2) DEFAULT 0.0 CHECK (stakeholder_satisfaction BETWEEN 0.0 AND 5.0),
  
  -- Learning and improvement
  lessons_learned TEXT,
  preventive_measures JSONB DEFAULT '[]',
  process_improvements JSONB DEFAULT '[]',
  
  -- Status and approval
  status VARCHAR(20) DEFAULT 'identified' CHECK (status IN ('identified', 'analyzing', 'planning', 'implementing', 'monitoring', 'closed')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

-- AI-generated resource recommendations
CREATE TABLE resource_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recommendation_type VARCHAR(50) NOT NULL CHECK (recommendation_type IN (
    'employee_assignment', 'skill_development', 'team_composition', 'capacity_adjustment',
    'resource_reallocation', 'hiring_recommendation', 'training_suggestion', 'tool_recommendation'
  )),
  
  -- Target entities
  project_id UUID, -- Will reference projects table
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  team_id UUID, -- Will reference teams table if exists
  department_id UUID REFERENCES departments(id),
  
  -- Recommendation details
  recommendation_title VARCHAR(200) NOT NULL,
  recommendation_description TEXT NOT NULL,
  reasoning JSONB DEFAULT '{}', -- AI reasoning and factors considered
  
  -- AI scoring and confidence
  recommendation_score DECIMAL(5,4) NOT NULL DEFAULT 0.0 CHECK (recommendation_score BETWEEN 0.0 AND 1.0),
  confidence_level DECIMAL(3,2) DEFAULT 0.7 CHECK (confidence_level BETWEEN 0.0 AND 1.0),
  certainty_factors JSONB DEFAULT '{}', -- factors affecting confidence
  
  -- Business impact prediction
  expected_benefit JSONB DEFAULT '{}', -- productivity, cost, quality improvements
  estimated_roi DECIMAL(8,4) DEFAULT 0.0,
  risk_factors JSONB DEFAULT '[]',
  implementation_complexity VARCHAR(20) DEFAULT 'medium' CHECK (implementation_complexity IN ('low', 'medium', 'high')),
  
  -- Implementation details
  implementation_effort_hours DECIMAL(6,2) DEFAULT 0.0,
  implementation_cost DECIMAL(10,2) DEFAULT 0.0,
  timeline_to_implement_days INTEGER DEFAULT 0,
  required_approvals JSONB DEFAULT '[]',
  dependencies JSONB DEFAULT '[]',
  
  -- Priority and urgency
  priority_level VARCHAR(20) DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'urgent')),
  urgency_score DECIMAL(3,2) DEFAULT 0.5 CHECK (urgency_score BETWEEN 0.0 AND 1.0),
  business_criticality VARCHAR(20) DEFAULT 'normal' CHECK (business_criticality IN ('low', 'normal', 'high', 'critical')),
  
  -- Recommendation lifecycle
  status VARCHAR(20) DEFAULT 'generated' CHECK (status IN ('generated', 'reviewed', 'approved', 'rejected', 'implemented', 'monitoring', 'completed')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Implementation tracking
  implementation_start_date TIMESTAMPTZ,
  implementation_end_date TIMESTAMPTZ,
  actual_outcome JSONB DEFAULT '{}',
  success_measurement JSONB DEFAULT '{}',
  
  -- Machine learning feedback
  feedback_score INTEGER DEFAULT 0 CHECK (feedback_score BETWEEN -5 AND 5),
  feedback_comments TEXT,
  actual_benefit_realized JSONB DEFAULT '{}',
  recommendation_accuracy DECIMAL(3,2) DEFAULT 0.0 CHECK (recommendation_accuracy BETWEEN 0.0 AND 1.0),
  
  -- Expiration and validity
  valid_until TIMESTAMPTZ,
  is_expired BOOLEAN DEFAULT false,
  superseded_by UUID REFERENCES resource_recommendations(id),
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

-- AI optimization algorithms performance tracking
CREATE TABLE optimization_algorithm_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  algorithm_name VARCHAR(100) NOT NULL,
  algorithm_version VARCHAR(50) NOT NULL,
  optimization_type VARCHAR(50) NOT NULL,
  
  -- Performance metrics
  average_execution_time_seconds DECIMAL(8,2) DEFAULT 0.0,
  average_optimization_score DECIMAL(8,4) DEFAULT 0.0,
  success_rate DECIMAL(5,4) DEFAULT 0.0 CHECK (success_rate BETWEEN 0.0 AND 1.0),
  convergence_rate DECIMAL(5,4) DEFAULT 0.0 CHECK (convergence_rate BETWEEN 0.0 AND 1.0),
  
  -- Algorithm characteristics
  complexity_class VARCHAR(20) DEFAULT 'polynomial',
  scalability_factor DECIMAL(5,2) DEFAULT 1.0,
  memory_usage_mb INTEGER DEFAULT 0,
  cpu_efficiency_score DECIMAL(3,2) DEFAULT 0.5 CHECK (cpu_efficiency_score BETWEEN 0.0 AND 1.0),
  
  -- Business value metrics
  average_improvement_percentage DECIMAL(5,2) DEFAULT 0.0,
  cost_effectiveness_score DECIMAL(5,4) DEFAULT 0.0,
  user_satisfaction_rating DECIMAL(3,2) DEFAULT 0.0 CHECK (user_satisfaction_rating BETWEEN 0.0 AND 5.0),
  
  -- Configuration and tuning
  optimal_parameters JSONB DEFAULT '{}',
  parameter_sensitivity JSONB DEFAULT '{}',
  recommended_use_cases JSONB DEFAULT '[]',
  limitations JSONB DEFAULT '[]',
  
  -- Usage statistics
  total_runs INTEGER DEFAULT 0,
  successful_runs INTEGER DEFAULT 0,
  failed_runs INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Status and lifecycle
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('development', 'testing', 'active', 'deprecated', 'retired')),
  deployment_date TIMESTAMPTZ,
  retirement_date TIMESTAMPTZ,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  
  -- Constraints
  UNIQUE(algorithm_name, algorithm_version)
);

-- Optimization constraints definition
CREATE TABLE optimization_constraints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  constraint_name VARCHAR(200) NOT NULL,
  constraint_type VARCHAR(50) NOT NULL CHECK (constraint_type IN (
    'capacity', 'skill', 'budget', 'timeline', 'availability', 'preference', 
    'compliance', 'quality', 'risk', 'business_rule'
  )),
  
  -- Constraint definition
  constraint_description TEXT NOT NULL,
  constraint_formula JSONB DEFAULT '{}', -- mathematical or logical definition
  constraint_parameters JSONB DEFAULT '{}',
  
  -- Constraint properties
  is_hard_constraint BOOLEAN DEFAULT true, -- hard vs soft constraint
  violation_penalty DECIMAL(8,4) DEFAULT 0.0, -- penalty for soft constraint violation
  priority_weight DECIMAL(3,2) DEFAULT 1.0 CHECK (priority_weight BETWEEN 0.0 AND 1.0),
  
  -- Scope and applicability
  applicable_optimization_types JSONB DEFAULT '[]',
  applicable_entities JSONB DEFAULT '{}', -- projects, employees, departments
  effective_date_start DATE,
  effective_date_end DATE,
  
  -- Validation and testing
  validation_rules JSONB DEFAULT '{}',
  test_cases JSONB DEFAULT '[]',
  violation_examples JSONB DEFAULT '[]',
  
  -- Business context
  business_justification TEXT,
  stakeholder_importance VARCHAR(20) DEFAULT 'medium' CHECK (stakeholder_importance IN ('low', 'medium', 'high', 'critical')),
  compliance_requirement BOOLEAN DEFAULT false,
  
  -- Status and lifecycle
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'review', 'active', 'suspended', 'retired')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  violation_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  
  -- Constraints
  CONSTRAINT optimization_constraints_valid_date_range CHECK (effective_date_end IS NULL OR effective_date_start IS NULL OR effective_date_end >= effective_date_start)
);

-- Create comprehensive indexes for optimization performance
CREATE INDEX idx_optimization_runs_type ON optimization_runs(optimization_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_optimization_runs_status ON optimization_runs(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_optimization_runs_score ON optimization_runs(optimization_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_optimization_runs_execution_time ON optimization_runs(execution_start_time DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_optimization_runs_algorithm ON optimization_runs(algorithm_used) WHERE deleted_at IS NULL;
CREATE INDEX idx_optimization_runs_implementation ON optimization_runs(implementation_status) WHERE deleted_at IS NULL;

CREATE INDEX idx_conflict_resolutions_type ON conflict_resolutions(conflict_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_conflict_resolutions_severity ON conflict_resolutions(severity_level) WHERE deleted_at IS NULL;
CREATE INDEX idx_conflict_resolutions_status ON conflict_resolutions(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_conflict_resolutions_strategy ON conflict_resolutions(strategy) WHERE deleted_at IS NULL;
CREATE INDEX idx_conflict_resolutions_outcome ON conflict_resolutions(outcome) WHERE deleted_at IS NULL;
CREATE INDEX idx_conflict_resolutions_detected ON conflict_resolutions(detected_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_conflict_resolutions_effectiveness ON conflict_resolutions(resolution_effectiveness DESC) WHERE deleted_at IS NULL;

CREATE INDEX idx_resource_recommendations_type ON resource_recommendations(recommendation_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_resource_recommendations_project ON resource_recommendations(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_resource_recommendations_employee ON resource_recommendations(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_resource_recommendations_score ON resource_recommendations(recommendation_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_resource_recommendations_priority ON resource_recommendations(priority_level) WHERE deleted_at IS NULL;
CREATE INDEX idx_resource_recommendations_status ON resource_recommendations(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_resource_recommendations_urgency ON resource_recommendations(urgency_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_resource_recommendations_valid_until ON resource_recommendations(valid_until) WHERE deleted_at IS NULL AND is_expired = false;

CREATE INDEX idx_optimization_algorithm_performance_type ON optimization_algorithm_performance(optimization_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_optimization_algorithm_performance_success ON optimization_algorithm_performance(success_rate DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_optimization_algorithm_performance_efficiency ON optimization_algorithm_performance(cpu_efficiency_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_optimization_algorithm_performance_status ON optimization_algorithm_performance(status) WHERE deleted_at IS NULL;

CREATE INDEX idx_optimization_constraints_type ON optimization_constraints(constraint_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_optimization_constraints_status ON optimization_constraints(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_optimization_constraints_hard ON optimization_constraints(is_hard_constraint) WHERE deleted_at IS NULL;
CREATE INDEX idx_optimization_constraints_effective ON optimization_constraints(effective_date_start, effective_date_end) WHERE deleted_at IS NULL;
CREATE INDEX idx_optimization_constraints_applicability ON optimization_constraints USING GIN(applicable_optimization_types) WHERE deleted_at IS NULL;

-- Create triggers for updated_at columns
CREATE TRIGGER trigger_optimization_runs_updated_at
  BEFORE UPDATE ON optimization_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_conflict_resolutions_updated_at
  BEFORE UPDATE ON conflict_resolutions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_resource_recommendations_updated_at
  BEFORE UPDATE ON resource_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_optimization_algorithm_performance_updated_at
  BEFORE UPDATE ON optimization_algorithm_performance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_optimization_constraints_updated_at
  BEFORE UPDATE ON optimization_constraints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically calculate execution duration
CREATE OR REPLACE FUNCTION calculate_optimization_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate duration when end time is set
  IF NEW.execution_end_time IS NOT NULL AND NEW.execution_start_time IS NOT NULL THEN
    NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.execution_end_time - NEW.execution_start_time));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic duration calculation
CREATE TRIGGER trigger_optimization_runs_duration
  BEFORE INSERT OR UPDATE ON optimization_runs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_optimization_duration();

-- Function to automatically expire recommendations
CREATE OR REPLACE FUNCTION check_recommendation_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark recommendation as expired if past valid_until date
  IF NEW.valid_until IS NOT NULL AND NEW.valid_until < NOW() THEN
    NEW.is_expired = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic expiry checking
CREATE TRIGGER trigger_resource_recommendations_expiry
  BEFORE INSERT OR UPDATE ON resource_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION check_recommendation_expiry();

-- Insert default optimization algorithms
INSERT INTO optimization_algorithm_performance (algorithm_name, algorithm_version, optimization_type, success_rate, cpu_efficiency_score) VALUES
('genetic_algorithm_v1', '1.0.0', 'resource_allocation', 0.85, 0.7),
('simulated_annealing_v1', '1.0.0', 'skill_matching', 0.78, 0.6),
('particle_swarm_v1', '1.0.0', 'capacity_balancing', 0.82, 0.8),
('constraint_programming_v1', '1.0.0', 'timeline_optimization', 0.91, 0.5),
('machine_learning_ensemble_v1', '1.0.0', 'team_formation', 0.73, 0.9),
('greedy_heuristic_v1', '1.0.0', 'workload_distribution', 0.67, 0.95);

-- Insert common optimization constraints
INSERT INTO optimization_constraints (constraint_name, constraint_type, constraint_description, is_hard_constraint, priority_weight) VALUES
('Maximum Weekly Hours', 'capacity', 'Employee cannot be allocated more than their weekly capacity', true, 1.0),
('Skill Level Requirement', 'skill', 'Project requires minimum skill level proficiency', true, 0.9),
('Budget Limit', 'budget', 'Project costs cannot exceed approved budget', true, 0.95),
('Availability Window', 'availability', 'Employee must be available during project timeline', true, 1.0),
('Team Size Preference', 'preference', 'Optimal team size based on project complexity', false, 0.6),
('Geographic Location', 'business_rule', 'Team members should be in compatible time zones', false, 0.4),
('Compliance Requirements', 'compliance', 'Team must include certified personnel for regulated projects', true, 0.85),
('Quality Standards', 'quality', 'Minimum experience level required for quality assurance', true, 0.8);

COMMIT;
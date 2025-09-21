-- Phase 4: Intelligent Features - Optimization and Conflict Resolution
-- Migration 023: Optimization Algorithms, Conflict Detection, and Cost Analysis
-- Description: Creates tables for resource optimization, conflict resolution, cost analysis, and decision support

-- Optimization runs and algorithms
CREATE TABLE IF NOT EXISTS optimization_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_name VARCHAR(100) NOT NULL,
    optimization_type VARCHAR(50) NOT NULL CHECK (optimization_type IN ('resource_allocation', 'skill_matching', 'capacity_planning', 'cost_minimization', 'utilization_maximization', 'schedule_optimization', 'multi_objective')),
    
    -- Optimization scope
    scope_type VARCHAR(50) NOT NULL CHECK (scope_type IN ('global', 'department', 'project', 'team', 'individual')),
    scope_entities JSONB, -- IDs of entities in scope (projects, departments, etc.)
    
    -- Time range for optimization
    optimization_period_start TIMESTAMP NOT NULL,
    optimization_period_end TIMESTAMP NOT NULL,
    
    -- Algorithm configuration
    algorithm_name VARCHAR(50) NOT NULL DEFAULT 'genetic_algorithm',
    algorithm_version VARCHAR(20) DEFAULT '1.0',
    algorithm_parameters JSONB NOT NULL,
    
    -- Objectives and constraints
    primary_objective VARCHAR(50) NOT NULL,
    secondary_objectives JSONB,
    hard_constraints JSONB NOT NULL, -- Must be satisfied
    soft_constraints JSONB, -- Preferably satisfied
    
    -- Optimization weights for multi-objective optimization
    objective_weights JSONB,
    
    -- Execution details
    run_status VARCHAR(20) DEFAULT 'pending' CHECK (run_status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    execution_time_ms BIGINT,
    
    -- Results
    solution_found BOOLEAN DEFAULT false,
    solution_quality_score DECIMAL(5,4), -- 0-1 score of solution quality
    convergence_iterations INTEGER,
    best_objective_value DECIMAL(15,4),
    
    -- Solution data
    optimized_assignments JSONB, -- The actual optimized resource assignments
    improvement_metrics JSONB, -- Before/after comparison
    
    -- Resource consumption
    memory_usage_mb DECIMAL(10,2),
    cpu_time_ms BIGINT,
    api_calls_made INTEGER DEFAULT 0,
    
    -- Metadata
    created_by UUID REFERENCES employees(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alternative solutions generated during optimization
CREATE TABLE IF NOT EXISTS optimization_solutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES optimization_runs(id) ON DELETE CASCADE,
    solution_rank INTEGER NOT NULL, -- 1 = best solution
    
    -- Solution metrics
    objective_value DECIMAL(15,4) NOT NULL,
    feasibility_score DECIMAL(5,4) DEFAULT 1.0, -- How well it satisfies constraints
    robustness_score DECIMAL(5,4), -- How stable the solution is to changes
    
    -- Solution details
    assignments JSONB NOT NULL, -- Resource assignments in this solution
    constraint_violations JSONB, -- Any soft constraint violations
    risk_assessment JSONB,
    
    -- Comparison with current state
    improvement_percentage DECIMAL(6,2),
    implementation_effort DECIMAL(5,2), -- 1-10 scale of effort needed
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(run_id, solution_rank)
);

-- Conflict detection and management
CREATE TABLE IF NOT EXISTS resource_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conflict_type VARCHAR(50) NOT NULL CHECK (conflict_type IN ('over_allocation', 'skill_mismatch', 'schedule_overlap', 'capacity_exceeded', 'budget_exceeded', 'dependency_violation', 'availability_conflict')),
    
    -- Conflict severity and priority
    severity_level VARCHAR(20) NOT NULL CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
    priority_score INTEGER DEFAULT 5 CHECK (priority_score >= 1 AND priority_score <= 10),
    
    -- Entities involved in the conflict
    primary_resource_type VARCHAR(50) NOT NULL, -- employee, project, skill, etc.
    primary_resource_id UUID NOT NULL,
    secondary_resource_type VARCHAR(50),
    secondary_resource_id UUID,
    
    -- Conflict context
    project_context INTEGER REFERENCES projects(id),
    time_period_start TIMESTAMP,
    time_period_end TIMESTAMP,
    
    -- Conflict details
    description TEXT NOT NULL,
    conflict_data JSONB NOT NULL, -- Specific conflict data
    root_cause JSONB,
    impact_analysis JSONB,
    
    -- Detection information
    detection_method VARCHAR(50) DEFAULT 'automated', -- automated, manual, reported
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    detected_by UUID REFERENCES employees(id),
    
    -- Resolution status
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'deferred', 'accepted_risk')),
    resolution_target_date TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conflict resolution strategies and outcomes
CREATE TABLE IF NOT EXISTS conflict_resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conflict_id UUID NOT NULL REFERENCES resource_conflicts(id) ON DELETE CASCADE,
    
    -- Resolution strategy
    strategy_name VARCHAR(100) NOT NULL,
    strategy_type VARCHAR(50) NOT NULL CHECK (strategy_type IN ('reallocation', 'rescheduling', 'skill_substitution', 'capacity_increase', 'scope_reduction', 'timeline_extension', 'priority_adjustment', 'resource_hiring')),
    
    -- Strategy details
    description TEXT,
    implementation_steps JSONB,
    required_approvals JSONB,
    
    -- Impact assessment
    cost_impact DECIMAL(15,2),
    time_impact_days INTEGER,
    resource_impact JSONB,
    risk_impact JSONB,
    
    -- Implementation tracking
    implementation_status VARCHAR(20) DEFAULT 'proposed' CHECK (implementation_status IN ('proposed', 'approved', 'implementing', 'completed', 'failed', 'rolled_back')),
    implementation_start TIMESTAMP,
    implementation_end TIMESTAMP,
    
    -- Effectiveness measurement
    effectiveness_score DECIMAL(5,4), -- How well did this resolve the conflict?
    side_effects JSONB, -- Unintended consequences
    
    -- Approval workflow
    proposed_by UUID REFERENCES employees(id),
    approved_by UUID REFERENCES employees(id),
    approval_date TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cost analysis and financial optimization
CREATE TABLE IF NOT EXISTS resource_cost_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_type VARCHAR(50) NOT NULL CHECK (analysis_type IN ('individual', 'project', 'department', 'skill_based', 'time_period', 'scenario_comparison')),
    
    -- Analysis scope
    resource_type VARCHAR(50) NOT NULL, -- employee, skill, project, department
    resource_id UUID NOT NULL,
    analysis_period_start TIMESTAMP NOT NULL,
    analysis_period_end TIMESTAMP NOT NULL,
    
    -- Cost components
    direct_costs JSONB NOT NULL, -- Salaries, contractor fees, etc.
    indirect_costs JSONB, -- Overhead, benefits, training, etc.
    opportunity_costs JSONB, -- Cost of not using resources elsewhere
    
    -- Cost calculations
    total_cost DECIMAL(15,2) NOT NULL,
    cost_per_hour DECIMAL(10,2),
    cost_per_project DECIMAL(15,2),
    utilization_adjusted_cost DECIMAL(15,2),
    
    -- Benchmarking
    market_rate_comparison DECIMAL(6,2), -- Percentage vs market rate
    internal_cost_comparison JSONB, -- Vs other similar resources
    efficiency_ratio DECIMAL(6,4), -- Output per cost unit
    
    -- Optimization suggestions
    cost_optimization_suggestions JSONB,
    potential_savings DECIMAL(15,2),
    roi_improvement_potential DECIMAL(6,2),
    
    -- Data sources and validation
    data_sources JSONB NOT NULL,
    confidence_level DECIMAL(5,4) DEFAULT 0.8,
    last_validated TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES employees(id)
);

-- Decision support and recommendation engine
CREATE TABLE IF NOT EXISTS optimization_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_type VARCHAR(50) NOT NULL CHECK (recommendation_type IN ('resource_allocation', 'hiring', 'training', 'project_staffing', 'capacity_adjustment', 'skill_development', 'cost_reduction', 'process_improvement')),
    
    -- Target and scope
    target_entity_type VARCHAR(50) NOT NULL,
    target_entity_id UUID NOT NULL,
    recommendation_scope VARCHAR(50) DEFAULT 'operational', -- operational, tactical, strategic
    
    -- Recommendation details
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    rationale TEXT,
    
    -- Priority and urgency
    priority_level VARCHAR(20) NOT NULL CHECK (priority_level IN ('low', 'medium', 'high', 'critical')),
    urgency_score INTEGER DEFAULT 5 CHECK (urgency_score >= 1 AND urgency_score <= 10),
    
    -- Business impact
    expected_benefits JSONB,
    quantified_impact DECIMAL(15,2),
    confidence_score DECIMAL(5,4) DEFAULT 0.5,
    
    -- Implementation
    implementation_complexity VARCHAR(20) CHECK (implementation_complexity IN ('low', 'medium', 'high')),
    estimated_effort_hours DECIMAL(8,2),
    required_resources JSONB,
    timeline_weeks INTEGER,
    
    -- Dependencies and risks
    dependencies JSONB,
    risks JSONB,
    success_criteria JSONB,
    
    -- Tracking
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'accepted', 'rejected', 'implemented', 'outdated')),
    created_by_system BOOLEAN DEFAULT true,
    reviewed_by UUID REFERENCES employees(id),
    review_date TIMESTAMP,
    
    -- Effectiveness measurement
    actual_impact DECIMAL(15,2),
    implementation_success BOOLEAN,
    lessons_learned TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Machine learning model performance tracking
CREATE TABLE IF NOT EXISTS ml_model_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(100) NOT NULL,
    model_type VARCHAR(50) NOT NULL, -- classification, regression, clustering, etc.
    model_version VARCHAR(20) NOT NULL,
    
    -- Performance period
    evaluation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    training_period_start TIMESTAMP,
    training_period_end TIMESTAMP,
    
    -- Dataset information
    training_data_size INTEGER,
    validation_data_size INTEGER,
    test_data_size INTEGER,
    feature_count INTEGER,
    
    -- Performance metrics
    accuracy DECIMAL(6,4),
    precision DECIMAL(6,4),
    recall DECIMAL(6,4),
    f1_score DECIMAL(6,4),
    auc_score DECIMAL(6,4),
    mae DECIMAL(15,4), -- Mean Absolute Error
    rmse DECIMAL(15,4), -- Root Mean Square Error
    r_squared DECIMAL(6,4),
    
    -- Model specific metrics
    custom_metrics JSONB,
    
    -- Deployment tracking
    is_production BOOLEAN DEFAULT false,
    deployment_date TIMESTAMP,
    prediction_count BIGINT DEFAULT 0,
    average_prediction_time_ms DECIMAL(10,2),
    
    -- Model drift detection
    data_drift_score DECIMAL(6,4),
    concept_drift_score DECIMAL(6,4),
    performance_degradation DECIMAL(6,4),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comprehensive indexing strategy
CREATE INDEX IF NOT EXISTS idx_optimization_runs_type ON optimization_runs(optimization_type);
CREATE INDEX IF NOT EXISTS idx_optimization_runs_status ON optimization_runs(run_status);
CREATE INDEX IF NOT EXISTS idx_optimization_runs_period ON optimization_runs(optimization_period_start, optimization_period_end);
CREATE INDEX IF NOT EXISTS idx_optimization_runs_quality ON optimization_runs(solution_quality_score DESC) WHERE solution_found = true;

CREATE INDEX IF NOT EXISTS idx_optimization_solutions_run ON optimization_solutions(run_id);
CREATE INDEX IF NOT EXISTS idx_optimization_solutions_rank ON optimization_solutions(run_id, solution_rank);
CREATE INDEX IF NOT EXISTS idx_optimization_solutions_value ON optimization_solutions(objective_value DESC);

CREATE INDEX IF NOT EXISTS idx_conflicts_type_severity ON resource_conflicts(conflict_type, severity_level);
CREATE INDEX IF NOT EXISTS idx_conflicts_status ON resource_conflicts(status);
CREATE INDEX IF NOT EXISTS idx_conflicts_priority ON resource_conflicts(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_conflicts_resource ON resource_conflicts(primary_resource_type, primary_resource_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_detection ON resource_conflicts(detected_at);
CREATE INDEX IF NOT EXISTS idx_conflicts_project ON resource_conflicts(project_context) WHERE project_context IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conflict_resolutions_conflict ON conflict_resolutions(conflict_id);
CREATE INDEX IF NOT EXISTS idx_conflict_resolutions_strategy ON conflict_resolutions(strategy_type);
CREATE INDEX IF NOT EXISTS idx_conflict_resolutions_status ON conflict_resolutions(implementation_status);

CREATE INDEX IF NOT EXISTS idx_cost_analysis_type ON resource_cost_analysis(analysis_type);
CREATE INDEX IF NOT EXISTS idx_cost_analysis_resource ON resource_cost_analysis(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_cost_analysis_period ON resource_cost_analysis(analysis_period_start, analysis_period_end);
CREATE INDEX IF NOT EXISTS idx_cost_analysis_total_cost ON resource_cost_analysis(total_cost DESC);

CREATE INDEX IF NOT EXISTS idx_recommendations_type ON optimization_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_recommendations_target ON optimization_recommendations(target_entity_type, target_entity_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_priority ON optimization_recommendations(priority_level, urgency_score DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON optimization_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_recommendations_expires ON optimization_recommendations(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ml_performance_model ON ml_model_performance(model_name, model_version);
CREATE INDEX IF NOT EXISTS idx_ml_performance_date ON ml_model_performance(evaluation_date);
CREATE INDEX IF NOT EXISTS idx_ml_performance_accuracy ON ml_model_performance(accuracy DESC) WHERE accuracy IS NOT NULL;

-- Triggers for automatic updates
CREATE TRIGGER update_optimization_runs_updated_at 
    BEFORE UPDATE ON optimization_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resource_conflicts_updated_at 
    BEFORE UPDATE ON resource_conflicts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conflict_resolutions_updated_at 
    BEFORE UPDATE ON conflict_resolutions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cost_analysis_updated_at 
    BEFORE UPDATE ON resource_cost_analysis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recommendations_updated_at 
    BEFORE UPDATE ON optimization_recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE OR REPLACE VIEW active_conflicts AS
SELECT 
    c.*,
    COUNT(cr.id) as resolution_attempts,
    MAX(cr.created_at) as last_resolution_attempt
FROM resource_conflicts c
LEFT JOIN conflict_resolutions cr ON c.id = cr.conflict_id
WHERE c.status IN ('open', 'in_progress')
GROUP BY c.id;

CREATE OR REPLACE VIEW optimization_performance AS
SELECT 
    optimization_type,
    COUNT(*) as total_runs,
    AVG(solution_quality_score) as avg_quality,
    AVG(execution_time_ms) as avg_execution_time_ms,
    COUNT(*) FILTER (WHERE solution_found = true) as successful_runs,
    AVG(best_objective_value) as avg_objective_value
FROM optimization_runs
WHERE run_status = 'completed'
GROUP BY optimization_type;

CREATE OR REPLACE VIEW cost_analysis_summary AS
SELECT 
    resource_type,
    COUNT(*) as analysis_count,
    AVG(total_cost) as avg_total_cost,
    SUM(potential_savings) as total_potential_savings,
    AVG(efficiency_ratio) as avg_efficiency_ratio
FROM resource_cost_analysis
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '6 months'
GROUP BY resource_type;

COMMENT ON TABLE optimization_runs IS 'Optimization algorithm executions and results';
COMMENT ON TABLE optimization_solutions IS 'Alternative solutions generated during optimization runs';
COMMENT ON TABLE resource_conflicts IS 'Detected conflicts in resource allocation and scheduling';
COMMENT ON TABLE conflict_resolutions IS 'Strategies and outcomes for resolving resource conflicts';
COMMENT ON TABLE resource_cost_analysis IS 'Financial analysis of resource utilization and costs';
COMMENT ON TABLE optimization_recommendations IS 'AI-generated recommendations for resource optimization';
COMMENT ON TABLE ml_model_performance IS 'Performance tracking for machine learning models';
COMMENT ON VIEW active_conflicts IS 'Currently active conflicts requiring attention';
COMMENT ON VIEW optimization_performance IS 'Performance metrics for optimization algorithms';
COMMENT ON VIEW cost_analysis_summary IS 'Summary statistics for cost analysis by resource type';
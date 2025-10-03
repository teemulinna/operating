-- Migration: ML Optimization Infrastructure
-- Created: 2025-09-07
-- Purpose: Create tables and infrastructure for AI-powered resource optimization features
-- Version: PostgreSQL 14 compatible

-- 1. Create enums for ML optimization
DO $$ 
BEGIN
    -- Create trigger event types
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trigger_event_type') THEN
        CREATE TYPE trigger_event_type AS ENUM (
            'project_change', 
            'employee_unavailable', 
            'skill_gap', 
            'budget_change', 
            'deadline_change', 
            'resource_conflict'
        );
    END IF;
    
    -- Create event sources
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_source') THEN
        CREATE TYPE event_source AS ENUM (
            'user_action', 
            'system_detection', 
            'external_integration', 
            'scheduled_check'
        );
    END IF;
    
    -- Create suggestion priorities
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'suggestion_priority') THEN
        CREATE TYPE suggestion_priority AS ENUM ('low', 'medium', 'high', 'urgent');
    END IF;
    
    -- Create suggestion categories
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'suggestion_category') THEN
        CREATE TYPE suggestion_category AS ENUM (
            'reallocation', 
            'capacity_adjustment', 
            'skill_development', 
            'timeline_adjustment', 
            'resource_acquisition'
        );
    END IF;
    
    -- Create suggestion statuses
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'suggestion_status') THEN
        CREATE TYPE suggestion_status AS ENUM (
            'pending', 
            'accepted', 
            'rejected', 
            'partially_implemented', 
            'expired'
        );
    END IF;
    
    -- Create optimization algorithm types
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'optimization_algorithm') THEN
        CREATE TYPE optimization_algorithm AS ENUM (
            'genetic', 
            'simulated_annealing', 
            'constraint_satisfaction', 
            'hybrid'
        );
    END IF;
END $$;

-- 2. Create real-time suggestions table
CREATE TABLE IF NOT EXISTS real_time_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggestion_id VARCHAR(100) NOT NULL UNIQUE,
    
    -- Trigger event information
    trigger_event JSONB NOT NULL,
    
    -- Suggestion metadata
    priority suggestion_priority NOT NULL DEFAULT 'medium',
    category suggestion_category NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    reasoning TEXT,
    
    -- Impact analysis
    impact JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Actions and alternatives
    actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    alternatives JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Scoring and metrics
    confidence DECIMAL(5,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    urgency INTEGER NOT NULL CHECK (urgency >= 0 AND urgency <= 100),
    feasibility INTEGER NOT NULL CHECK (feasibility >= 0 AND feasibility <= 100),
    
    -- Timeline and dependencies
    timeline JSONB NOT NULL DEFAULT '{}'::jsonb,
    risks JSONB NOT NULL DEFAULT '[]'::jsonb,
    dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Status and lifecycle
    status suggestion_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Implementation tracking
    implementation_notes TEXT,
    implemented_actions JSONB DEFAULT '[]'::jsonb,
    failed_actions JSONB DEFAULT '[]'::jsonb,
    results JSONB DEFAULT '{}'::jsonb,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Foreign key references (optional)
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL
);

-- 3. Create ML optimization results table
CREATE TABLE IF NOT EXISTS ml_optimization_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    optimization_id VARCHAR(100) NOT NULL UNIQUE,
    
    -- Optimization metadata
    algorithm_used optimization_algorithm NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    iterations INTEGER NOT NULL DEFAULT 0,
    convergence_achieved BOOLEAN DEFAULT false,
    
    -- Optimization scope
    scope JSONB NOT NULL DEFAULT '{}'::jsonb,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- State information
    current_state JSONB NOT NULL,
    optimized_state JSONB NOT NULL,
    
    -- Improvements and changes
    improvements JSONB NOT NULL DEFAULT '{}'::jsonb,
    changes JSONB NOT NULL DEFAULT '[]'::jsonb,
    alternative_solutions JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Performance metrics
    performance JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Recommendations and risks
    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
    risks JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 4. Create demand forecasts table
CREATE TABLE IF NOT EXISTS demand_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forecast_id VARCHAR(100) NOT NULL UNIQUE,
    
    -- Forecast metadata
    forecast_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    time_horizon VARCHAR(20) NOT NULL CHECK (time_horizon IN ('weekly', 'monthly', 'quarterly', 'yearly')),
    forecast_period JSONB NOT NULL,
    
    -- Forecast data
    skill_demand_forecasts JSONB NOT NULL DEFAULT '[]'::jsonb,
    department_forecasts JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Metrics and analysis
    overall_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    confidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    seasonality_factors JSONB NOT NULL DEFAULT '{}'::jsonb,
    trend_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Configuration and options
    options JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Status and validation
    status VARCHAR(50) DEFAULT 'active',
    accuracy_score DECIMAL(5,2),
    last_validated TIMESTAMP WITH TIME ZONE,
    
    -- Lifecycle
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 5. Create skill matching sessions table
CREATE TABLE IF NOT EXISTS skill_matching_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100) NOT NULL UNIQUE,
    
    -- Session metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    role_id UUID,
    
    -- Matching criteria
    criteria JSONB NOT NULL,
    options JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Results
    matches JSONB NOT NULL DEFAULT '[]'::jsonb,
    match_count INTEGER NOT NULL DEFAULT 0,
    
    -- Performance metrics
    processing_time_ms INTEGER,
    confidence_scores JSONB DEFAULT '{}'::jsonb,
    
    -- Status
    status VARCHAR(50) DEFAULT 'completed',
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 6. Create performance benchmarks table
CREATE TABLE IF NOT EXISTS ml_performance_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    benchmark_id VARCHAR(100) NOT NULL,
    
    -- Benchmark metadata
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    algorithm_type VARCHAR(100) NOT NULL,
    test_type VARCHAR(100) NOT NULL,
    
    -- Performance metrics
    latency_ms INTEGER,
    accuracy_score DECIMAL(5,2),
    memory_usage_mb DECIMAL(10,2),
    cpu_usage_percent DECIMAL(5,2),
    
    -- Test configuration
    test_config JSONB DEFAULT '{}'::jsonb,
    
    -- Results
    results JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_real_time_suggestions_status 
    ON real_time_suggestions(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_real_time_suggestions_priority 
    ON real_time_suggestions(priority, urgency DESC);

CREATE INDEX IF NOT EXISTS idx_real_time_suggestions_category 
    ON real_time_suggestions(category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_real_time_suggestions_project 
    ON real_time_suggestions(project_id) WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_real_time_suggestions_employee 
    ON real_time_suggestions(employee_id) WHERE employee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_real_time_suggestions_expires 
    ON real_time_suggestions(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ml_optimization_results_created 
    ON ml_optimization_results(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ml_optimization_results_algorithm 
    ON ml_optimization_results(algorithm_used, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_demand_forecasts_horizon 
    ON demand_forecasts(time_horizon, forecast_date DESC);

CREATE INDEX IF NOT EXISTS idx_demand_forecasts_status 
    ON demand_forecasts(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_skill_matching_sessions_project 
    ON skill_matching_sessions(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ml_performance_benchmarks_algorithm 
    ON ml_performance_benchmarks(algorithm_type, timestamp DESC);

-- 8. Create GIN indexes for JSONB columns for efficient querying
CREATE INDEX IF NOT EXISTS idx_real_time_suggestions_trigger_event_gin 
    ON real_time_suggestions USING GIN (trigger_event);

CREATE INDEX IF NOT EXISTS idx_real_time_suggestions_impact_gin 
    ON real_time_suggestions USING GIN (impact);

CREATE INDEX IF NOT EXISTS idx_real_time_suggestions_actions_gin 
    ON real_time_suggestions USING GIN (actions);

CREATE INDEX IF NOT EXISTS idx_ml_optimization_results_improvements_gin 
    ON ml_optimization_results USING GIN (improvements);

CREATE INDEX IF NOT EXISTS idx_demand_forecasts_skill_forecasts_gin 
    ON demand_forecasts USING GIN (skill_demand_forecasts);

CREATE INDEX IF NOT EXISTS idx_skill_matching_sessions_criteria_gin 
    ON skill_matching_sessions USING GIN (criteria);

CREATE INDEX IF NOT EXISTS idx_skill_matching_sessions_matches_gin 
    ON skill_matching_sessions USING GIN (matches);

-- 9. Create functions and triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_ml_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS trigger_real_time_suggestions_updated_at ON real_time_suggestions;
CREATE TRIGGER trigger_real_time_suggestions_updated_at
    BEFORE UPDATE ON real_time_suggestions
    FOR EACH ROW
    EXECUTE FUNCTION update_ml_updated_at_column();

DROP TRIGGER IF EXISTS trigger_demand_forecasts_updated_at ON demand_forecasts;
CREATE TRIGGER trigger_demand_forecasts_updated_at
    BEFORE UPDATE ON demand_forecasts
    FOR EACH ROW
    EXECUTE FUNCTION update_ml_updated_at_column();

-- 10. Create helper functions for ML operations

-- Function to get active suggestions for an employee
CREATE OR REPLACE FUNCTION get_active_suggestions_for_employee(emp_id UUID)
RETURNS TABLE(
    suggestion_id VARCHAR(100),
    title VARCHAR(200),
    priority suggestion_priority,
    category suggestion_category,
    urgency INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rts.suggestion_id,
        rts.title,
        rts.priority,
        rts.category,
        rts.urgency,
        rts.created_at
    FROM real_time_suggestions rts
    WHERE (
        rts.employee_id = emp_id 
        OR rts.impact->'affected_employees' ? emp_id::text
    )
    AND rts.status = 'pending'
    AND (rts.expires_at IS NULL OR rts.expires_at > CURRENT_TIMESTAMP)
    ORDER BY 
        CASE rts.priority 
            WHEN 'urgent' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
        END,
        rts.urgency DESC,
        rts.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get optimization history for a project
CREATE OR REPLACE FUNCTION get_optimization_history_for_project(proj_id INTEGER)
RETURNS TABLE(
    optimization_id VARCHAR(100),
    algorithm_used optimization_algorithm,
    start_time TIMESTAMP WITH TIME ZONE,
    improvements JSONB,
    status VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mor.optimization_id,
        mor.algorithm_used,
        mor.start_time,
        mor.improvements,
        mor.status
    FROM ml_optimization_results mor
    WHERE mor.scope->>'project_ids' LIKE '%' || proj_id::text || '%'
       OR mor.scope->'project_ids' ? proj_id::text
    ORDER BY mor.start_time DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired suggestions and old data
CREATE OR REPLACE FUNCTION cleanup_ml_data()
RETURNS INTEGER AS $$
DECLARE
    cleaned_suggestions INTEGER := 0;
    cleaned_forecasts INTEGER := 0;
    cleaned_benchmarks INTEGER := 0;
    total_cleaned INTEGER := 0;
BEGIN
    -- Clean up expired suggestions (older than 30 days)
    DELETE FROM real_time_suggestions
    WHERE status = 'expired' 
       OR (expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP - INTERVAL '30 days')
       OR (status IN ('accepted', 'rejected') AND updated_at < CURRENT_TIMESTAMP - INTERVAL '90 days');
    
    GET DIAGNOSTICS cleaned_suggestions = ROW_COUNT;
    
    -- Clean up old forecasts (keep last 50 per horizon)
    WITH ranked_forecasts AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY time_horizon ORDER BY forecast_date DESC) as rn
        FROM demand_forecasts
    )
    DELETE FROM demand_forecasts 
    WHERE id IN (
        SELECT id FROM ranked_forecasts WHERE rn > 50
    );
    
    GET DIAGNOSTICS cleaned_forecasts = ROW_COUNT;
    
    -- Clean up old benchmarks (keep last 100 per algorithm)
    WITH ranked_benchmarks AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY algorithm_type ORDER BY timestamp DESC) as rn
        FROM ml_performance_benchmarks
    )
    DELETE FROM ml_performance_benchmarks 
    WHERE id IN (
        SELECT id FROM ranked_benchmarks WHERE rn > 100
    );
    
    GET DIAGNOSTICS cleaned_benchmarks = ROW_COUNT;
    
    total_cleaned := cleaned_suggestions + cleaned_forecasts + cleaned_benchmarks;
    
    -- Log cleanup activity
    INSERT INTO system_logs (level, message, metadata, created_at)
    VALUES (
        'INFO',
        'ML data cleanup completed',
        jsonb_build_object(
            'cleaned_suggestions', cleaned_suggestions,
            'cleaned_forecasts', cleaned_forecasts,
            'cleaned_benchmarks', cleaned_benchmarks,
            'total_cleaned', total_cleaned
        ),
        CURRENT_TIMESTAMP
    );
    
    RETURN total_cleaned;
END;
$$ LANGUAGE plpgsql;

-- 11. Create system_logs table if it doesn't exist (for cleanup logging)
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level VARCHAR(20) NOT NULL DEFAULT 'INFO',
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_logs_level_created 
    ON system_logs(level, created_at DESC);

-- 12. Add table comments for documentation
COMMENT ON TABLE real_time_suggestions IS 'AI-generated suggestions for real-time resource allocation adjustments';
COMMENT ON TABLE ml_optimization_results IS 'Results from ML optimization algorithm runs';
COMMENT ON TABLE demand_forecasts IS 'AI-generated demand forecasts for resource planning';
COMMENT ON TABLE skill_matching_sessions IS 'Results from skill-based matching algorithm sessions';
COMMENT ON TABLE ml_performance_benchmarks IS 'Performance metrics for ML algorithms';
COMMENT ON TABLE system_logs IS 'System-wide logging for ML operations and cleanup activities';

-- Add column comments for key fields
COMMENT ON COLUMN real_time_suggestions.trigger_event IS 'JSON object containing the event that triggered the suggestion';
COMMENT ON COLUMN real_time_suggestions.impact IS 'JSON object containing impact analysis (affected projects, employees, metrics)';
COMMENT ON COLUMN real_time_suggestions.actions IS 'JSON array of suggested actions to take';
COMMENT ON COLUMN real_time_suggestions.confidence IS 'Confidence score for the suggestion (0-100)';
COMMENT ON COLUMN real_time_suggestions.urgency IS 'Urgency score for implementing the suggestion (0-100)';

COMMENT ON COLUMN ml_optimization_results.current_state IS 'JSON snapshot of resource allocation before optimization';
COMMENT ON COLUMN ml_optimization_results.optimized_state IS 'JSON snapshot of optimized resource allocation';
COMMENT ON COLUMN ml_optimization_results.improvements IS 'JSON object containing improvement metrics';

COMMENT ON COLUMN demand_forecasts.skill_demand_forecasts IS 'JSON array of skill-specific demand forecasts';
COMMENT ON COLUMN demand_forecasts.confidence IS 'JSON object containing confidence scores by skill/department';

-- Grant permissions (adjust as needed for your application user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;
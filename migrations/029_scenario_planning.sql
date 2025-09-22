-- Migration: 029_scenario_planning
-- Description: What-If Scenario Planning tables for capacity planning and impact analysis
-- Author: Resource Management System
-- Date: 2024-01-22

-- ============================================
-- ENABLE EXTENSIONS (if not already enabled)
-- ============================================

-- Ensure pgcrypto is enabled for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- CREATE ENUM TYPES
-- ============================================

-- Enum for scenario status
DO $$ BEGIN
    CREATE TYPE scenario_status AS ENUM (
        'draft',        -- Scenario being created/modified
        'analyzing',    -- Currently running impact analysis
        'analyzed',     -- Analysis complete, ready for review
        'approved',     -- Approved for potential implementation
        'applied',      -- Applied to actual allocations
        'rejected',     -- Rejected after review
        'archived'      -- Historical scenario, no longer active
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum for scenario priority
DO $$ BEGIN
    CREATE TYPE scenario_priority AS ENUM (
        'low',          -- Nice to have scenario
        'medium',       -- Standard planning scenario
        'high',         -- Important business case
        'critical'      -- Must-evaluate scenario
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum for impact severity
DO $$ BEGIN
    CREATE TYPE impact_severity AS ENUM (
        'none',         -- No impact
        'low',          -- Minor adjustments needed
        'medium',       -- Moderate changes required
        'high',         -- Significant reorganization needed
        'critical'      -- Major conflicts/blockers identified
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum for comparison result type
DO $$ BEGIN
    CREATE TYPE comparison_result_type AS ENUM (
        'capacity_utilization',
        'cost_variance',
        'skill_coverage',
        'timeline_impact',
        'risk_assessment'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- CREATE TABLES
-- ============================================

-- Planning scenarios master table
CREATE TABLE IF NOT EXISTS planning_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    scenario_status scenario_status NOT NULL DEFAULT 'draft',
    priority scenario_priority NOT NULL DEFAULT 'medium',
    created_by UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    owned_by UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    parent_scenario_id UUID REFERENCES planning_scenarios(id) ON DELETE CASCADE,

    -- Scenario parameters
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    budget_limit DECIMAL(12,2),
    max_resources INTEGER,

    -- Analysis metadata
    last_analyzed_at TIMESTAMP WITH TIME ZONE,
    analysis_duration_ms INTEGER,

    -- Approval workflow
    approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,

    -- Application tracking
    applied_at TIMESTAMP WITH TIME ZONE,
    applied_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    rollback_at TIMESTAMP WITH TIME ZONE,
    rollback_by UUID REFERENCES employees(id) ON DELETE SET NULL,

    -- Scenario configuration
    constraints_config JSONB DEFAULT '{}'::jsonb,
    optimization_params JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT chk_scenario_dates CHECK (end_date >= start_date),
    CONSTRAINT chk_scenario_date_range CHECK (
        start_date >= CURRENT_DATE - INTERVAL '1 year'
        AND end_date <= CURRENT_DATE + INTERVAL '5 years'
    ),
    CONSTRAINT chk_budget_positive CHECK (budget_limit IS NULL OR budget_limit > 0),
    CONSTRAINT chk_max_resources_positive CHECK (max_resources IS NULL OR max_resources > 0),
    CONSTRAINT chk_approved_status CHECK (
        (scenario_status IN ('approved', 'applied') AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
        OR (scenario_status NOT IN ('approved', 'applied'))
    ),
    CONSTRAINT chk_applied_status CHECK (
        (scenario_status = 'applied' AND applied_by IS NOT NULL AND applied_at IS NOT NULL)
        OR (scenario_status != 'applied')
    )
);

-- Scenario allocations (resource assignments within scenarios)
CREATE TABLE IF NOT EXISTS scenario_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id UUID NOT NULL REFERENCES planning_scenarios(id) ON DELETE CASCADE,

    -- Resource allocation details (mirrors resource_allocations structure)
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    allocated_hours DECIMAL(6,2) NOT NULL CHECK (allocated_hours > 0),
    billable_rate DECIMAL(10,2) CHECK (billable_rate >= 0),

    -- Scenario-specific fields
    original_allocation_id UUID REFERENCES resource_allocations(id) ON DELETE SET NULL,
    is_modification BOOLEAN DEFAULT false,
    is_new_allocation BOOLEAN DEFAULT false,

    -- Conflict tracking
    has_conflict BOOLEAN DEFAULT false,
    conflict_details JSONB,

    -- Calculated fields
    total_hours DECIMAL(8,2) GENERATED ALWAYS AS (
        allocated_hours * (end_date - start_date + 1)
    ) STORED,
    total_cost DECIMAL(12,2) GENERATED ALWAYS AS (
        CASE
            WHEN billable_rate IS NOT NULL
            THEN allocated_hours * (end_date - start_date + 1) * billable_rate
            ELSE 0
        END
    ) STORED,

    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_scenario_allocation_dates CHECK (end_date >= start_date),
    CONSTRAINT chk_scenario_modification_xor_new CHECK (
        (is_modification = true AND is_new_allocation = false) OR
        (is_modification = false AND is_new_allocation = true) OR
        (is_modification = false AND is_new_allocation = false)
    ),
    CONSTRAINT uk_scenario_allocation UNIQUE (scenario_id, employee_id, project_id, start_date)
);

-- Scenario impact analysis results
CREATE TABLE IF NOT EXISTS scenario_impact_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id UUID NOT NULL REFERENCES planning_scenarios(id) ON DELETE CASCADE,
    analysis_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Overall impact metrics
    overall_severity impact_severity NOT NULL,
    total_affected_employees INTEGER NOT NULL DEFAULT 0,
    total_affected_projects INTEGER NOT NULL DEFAULT 0,

    -- Capacity impact
    avg_utilization_before DECIMAL(5,2),
    avg_utilization_after DECIMAL(5,2),
    peak_utilization_before DECIMAL(5,2),
    peak_utilization_after DECIMAL(5,2),
    over_allocated_days_before INTEGER DEFAULT 0,
    over_allocated_days_after INTEGER DEFAULT 0,

    -- Cost impact
    total_cost_before DECIMAL(14,2),
    total_cost_after DECIMAL(14,2),
    cost_variance DECIMAL(14,2) GENERATED ALWAYS AS (
        total_cost_after - total_cost_before
    ) STORED,
    cost_variance_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE
            WHEN total_cost_before > 0
            THEN ((total_cost_after - total_cost_before) / total_cost_before) * 100
            ELSE 0
        END
    ) STORED,

    -- Resource impact
    resources_added INTEGER DEFAULT 0,
    resources_removed INTEGER DEFAULT 0,
    resources_modified INTEGER DEFAULT 0,

    -- Skill coverage
    required_skills_covered DECIMAL(5,2),
    skill_gaps_identified INTEGER DEFAULT 0,

    -- Risk assessment
    high_risk_allocations INTEGER DEFAULT 0,
    conflicts_identified INTEGER DEFAULT 0,

    -- Detailed analysis results
    impact_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    warnings JSONB DEFAULT '[]'::jsonb,

    -- Performance metrics
    analysis_duration_ms INTEGER,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_utilization_percentages CHECK (
        (avg_utilization_before IS NULL OR (avg_utilization_before >= 0 AND avg_utilization_before <= 999.99)) AND
        (avg_utilization_after IS NULL OR (avg_utilization_after >= 0 AND avg_utilization_after <= 999.99)) AND
        (peak_utilization_before IS NULL OR (peak_utilization_before >= 0 AND peak_utilization_before <= 999.99)) AND
        (peak_utilization_after IS NULL OR (peak_utilization_after >= 0 AND peak_utilization_after <= 999.99))
    )
);

-- Scenario comparison results
CREATE TABLE IF NOT EXISTS scenario_comparison_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_a_id UUID NOT NULL REFERENCES planning_scenarios(id) ON DELETE CASCADE,
    scenario_b_id UUID NOT NULL REFERENCES planning_scenarios(id) ON DELETE CASCADE,
    comparison_type comparison_result_type NOT NULL,

    -- Comparison metrics
    metric_name VARCHAR(255) NOT NULL,
    value_a DECIMAL(14,2),
    value_b DECIMAL(14,2),
    difference DECIMAL(14,2) GENERATED ALWAYS AS (value_b - value_a) STORED,
    percentage_change DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE
            WHEN value_a > 0
            THEN ((value_b - value_a) / value_a) * 100
            ELSE 0
        END
    ) STORED,

    -- Interpretation
    better_scenario_id UUID REFERENCES planning_scenarios(id) ON DELETE CASCADE,
    comparison_notes TEXT,

    -- Metadata
    compared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    compared_by UUID REFERENCES employees(id) ON DELETE SET NULL,

    -- Constraints
    CONSTRAINT chk_different_scenarios CHECK (scenario_a_id != scenario_b_id),
    CONSTRAINT chk_better_scenario_valid CHECK (
        better_scenario_id IS NULL OR
        better_scenario_id IN (scenario_a_id, scenario_b_id)
    )
);

-- Scenario audit log for tracking all changes
CREATE TABLE IF NOT EXISTS scenario_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id UUID NOT NULL REFERENCES planning_scenarios(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    performed_by UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Change details
    changes JSONB NOT NULL,
    previous_values JSONB,
    new_values JSONB,

    -- Context
    ip_address INET,
    user_agent TEXT,

    -- Indexing for queries
    CONSTRAINT chk_valid_action CHECK (
        action IN ('created', 'updated', 'analyzed', 'approved', 'rejected', 'applied', 'archived', 'rolled_back')
    )
);

-- ============================================
-- CREATE INDEXES
-- ============================================

-- Planning scenarios indexes
CREATE INDEX idx_scenarios_status ON planning_scenarios(scenario_status)
    WHERE scenario_status IN ('draft', 'analyzing', 'analyzed');

CREATE INDEX idx_scenarios_owner ON planning_scenarios(owned_by, created_at DESC);

CREATE INDEX idx_scenarios_date_range ON planning_scenarios(start_date, end_date)
    WHERE scenario_status != 'archived';

CREATE INDEX idx_scenarios_priority_status ON planning_scenarios(priority DESC, scenario_status)
    WHERE scenario_status IN ('draft', 'analyzed');

CREATE INDEX idx_scenarios_parent ON planning_scenarios(parent_scenario_id)
    WHERE parent_scenario_id IS NOT NULL;

CREATE INDEX idx_scenarios_approval_pending ON planning_scenarios(created_at DESC)
    WHERE scenario_status = 'analyzed' AND approved_by IS NULL;

-- Scenario allocations indexes
CREATE INDEX idx_scenario_allocations_scenario ON scenario_allocations(scenario_id);

CREATE INDEX idx_scenario_allocations_employee ON scenario_allocations(scenario_id, employee_id, start_date);

CREATE INDEX idx_scenario_allocations_project ON scenario_allocations(scenario_id, project_id);

CREATE INDEX idx_scenario_allocations_dates ON scenario_allocations(scenario_id, start_date, end_date);

CREATE INDEX idx_scenario_allocations_conflicts ON scenario_allocations(scenario_id, has_conflict)
    WHERE has_conflict = true;

CREATE INDEX idx_scenario_allocations_original ON scenario_allocations(original_allocation_id)
    WHERE original_allocation_id IS NOT NULL;

-- Impact analysis indexes
CREATE INDEX idx_impact_scenario ON scenario_impact_analysis(scenario_id, analysis_timestamp DESC);

CREATE INDEX idx_impact_severity ON scenario_impact_analysis(overall_severity, scenario_id)
    WHERE overall_severity IN ('high', 'critical');

CREATE INDEX idx_impact_recent ON scenario_impact_analysis(analysis_timestamp DESC);

-- Comparison results indexes
CREATE INDEX idx_comparison_scenarios ON scenario_comparison_results(scenario_a_id, scenario_b_id);

CREATE INDEX idx_comparison_type ON scenario_comparison_results(comparison_type, compared_at DESC);

-- Audit log indexes
CREATE INDEX idx_audit_scenario ON scenario_audit_log(scenario_id, performed_at DESC);

CREATE INDEX idx_audit_user ON scenario_audit_log(performed_by, performed_at DESC);

CREATE INDEX idx_audit_action ON scenario_audit_log(action, performed_at DESC);

-- GIN indexes for JSONB columns
CREATE INDEX idx_scenarios_constraints_gin ON planning_scenarios USING GIN (constraints_config);

CREATE INDEX idx_scenarios_optimization_gin ON planning_scenarios USING GIN (optimization_params);

CREATE INDEX idx_allocations_conflicts_gin ON scenario_allocations USING GIN (conflict_details);

CREATE INDEX idx_impact_details_gin ON scenario_impact_analysis USING GIN (impact_details);

CREATE INDEX idx_impact_recommendations_gin ON scenario_impact_analysis USING GIN (recommendations);

-- ============================================
-- CREATE TRIGGERS
-- ============================================

-- Update trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
CREATE TRIGGER trg_planning_scenarios_updated_at
    BEFORE UPDATE ON planning_scenarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_scenario_allocations_updated_at
    BEFORE UPDATE ON scenario_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CREATE HELPER FUNCTIONS
-- ============================================

-- Function to analyze scenario capacity impact
CREATE OR REPLACE FUNCTION analyze_scenario_capacity(
    p_scenario_id UUID
) RETURNS TABLE (
    employee_id UUID,
    employee_name VARCHAR(255),
    date_period DATE,
    current_utilization DECIMAL(5,2),
    scenario_utilization DECIMAL(5,2),
    utilization_change DECIMAL(5,2),
    is_over_allocated BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            (SELECT start_date FROM planning_scenarios WHERE id = p_scenario_id),
            (SELECT end_date FROM planning_scenarios WHERE id = p_scenario_id),
            '1 day'::interval
        )::date as period_date
    ),
    current_allocations AS (
        SELECT
            e.id as employee_id,
            ds.period_date,
            COALESCE(SUM(ra.allocated_hours), 0) as current_hours
        FROM employees e
        CROSS JOIN date_series ds
        LEFT JOIN resource_allocations ra ON
            ra.employee_id = e.id
            AND ds.period_date BETWEEN ra.start_date AND ra.end_date
            AND ra.is_active = true
        GROUP BY e.id, ds.period_date
    ),
    scenario_allocations_agg AS (
        SELECT
            sa.employee_id,
            ds.period_date,
            COALESCE(SUM(sa.allocated_hours), 0) as scenario_hours
        FROM scenario_allocations sa
        CROSS JOIN date_series ds
        WHERE sa.scenario_id = p_scenario_id
            AND ds.period_date BETWEEN sa.start_date AND sa.end_date
        GROUP BY sa.employee_id, ds.period_date
    )
    SELECT
        ca.employee_id,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name,
        ca.period_date as date_period,
        ROUND((ca.current_hours / NULLIF(e.daily_capacity_hours, 0)) * 100, 2) as current_utilization,
        ROUND(((ca.current_hours + COALESCE(sa.scenario_hours, 0) -
               CASE WHEN ra_orig.id IS NOT NULL THEN ra_orig.allocated_hours ELSE 0 END)
               / NULLIF(e.daily_capacity_hours, 0)) * 100, 2) as scenario_utilization,
        ROUND(((COALESCE(sa.scenario_hours, 0) -
               CASE WHEN ra_orig.id IS NOT NULL THEN ra_orig.allocated_hours ELSE 0 END)
               / NULLIF(e.daily_capacity_hours, 0)) * 100, 2) as utilization_change,
        (ca.current_hours + COALESCE(sa.scenario_hours, 0) -
         CASE WHEN ra_orig.id IS NOT NULL THEN ra_orig.allocated_hours ELSE 0 END) > e.daily_capacity_hours as is_over_allocated
    FROM current_allocations ca
    INNER JOIN employees e ON e.id = ca.employee_id
    LEFT JOIN scenario_allocations_agg sa ON
        sa.employee_id = ca.employee_id
        AND sa.period_date = ca.period_date
    LEFT JOIN scenario_allocations sa_check ON
        sa_check.scenario_id = p_scenario_id
        AND sa_check.employee_id = ca.employee_id
    LEFT JOIN resource_allocations ra_orig ON
        ra_orig.id = sa_check.original_allocation_id
    WHERE ca.current_hours > 0 OR sa.scenario_hours > 0
    ORDER BY ca.employee_id, ca.period_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to compare two scenarios
CREATE OR REPLACE FUNCTION compare_scenarios(
    p_scenario_a_id UUID,
    p_scenario_b_id UUID
) RETURNS TABLE (
    metric_category VARCHAR(50),
    metric_name VARCHAR(255),
    scenario_a_value DECIMAL(14,2),
    scenario_b_value DECIMAL(14,2),
    difference DECIMAL(14,2),
    percentage_change DECIMAL(5,2),
    better_scenario_id UUID
) AS $$
BEGIN
    -- Clear previous comparison results for these scenarios
    DELETE FROM scenario_comparison_results
    WHERE (scenario_a_id = p_scenario_a_id AND scenario_b_id = p_scenario_b_id)
       OR (scenario_a_id = p_scenario_b_id AND scenario_b_id = p_scenario_a_id);

    -- Insert new comparison results
    RETURN QUERY
    WITH scenario_metrics AS (
        SELECT
            s.id as scenario_id,
            COUNT(DISTINCT sa.employee_id) as total_resources,
            COUNT(DISTINCT sa.project_id) as total_projects,
            SUM(sa.total_hours) as total_hours,
            SUM(sa.total_cost) as total_cost,
            AVG(sa.allocated_hours) as avg_allocation
        FROM planning_scenarios s
        LEFT JOIN scenario_allocations sa ON sa.scenario_id = s.id
        WHERE s.id IN (p_scenario_a_id, p_scenario_b_id)
        GROUP BY s.id
    )
    SELECT
        'resources'::varchar as metric_category,
        'Total Resources'::varchar as metric_name,
        MAX(CASE WHEN scenario_id = p_scenario_a_id THEN total_resources ELSE 0 END)::decimal as scenario_a_value,
        MAX(CASE WHEN scenario_id = p_scenario_b_id THEN total_resources ELSE 0 END)::decimal as scenario_b_value,
        (MAX(CASE WHEN scenario_id = p_scenario_b_id THEN total_resources ELSE 0 END) -
         MAX(CASE WHEN scenario_id = p_scenario_a_id THEN total_resources ELSE 0 END))::decimal as difference,
        CASE
            WHEN MAX(CASE WHEN scenario_id = p_scenario_a_id THEN total_resources ELSE 0 END) > 0
            THEN ((MAX(CASE WHEN scenario_id = p_scenario_b_id THEN total_resources ELSE 0 END) -
                   MAX(CASE WHEN scenario_id = p_scenario_a_id THEN total_resources ELSE 0 END))::decimal /
                   MAX(CASE WHEN scenario_id = p_scenario_a_id THEN total_resources ELSE 0 END) * 100)::decimal(5,2)
            ELSE 0
        END as percentage_change,
        CASE
            WHEN MAX(CASE WHEN scenario_id = p_scenario_b_id THEN total_resources ELSE 0 END) <
                 MAX(CASE WHEN scenario_id = p_scenario_a_id THEN total_resources ELSE 0 END)
            THEN p_scenario_b_id
            ELSE p_scenario_a_id
        END as better_scenario_id
    FROM scenario_metrics

    UNION ALL

    SELECT
        'cost'::varchar,
        'Total Cost'::varchar,
        MAX(CASE WHEN scenario_id = p_scenario_a_id THEN total_cost ELSE 0 END)::decimal,
        MAX(CASE WHEN scenario_id = p_scenario_b_id THEN total_cost ELSE 0 END)::decimal,
        (MAX(CASE WHEN scenario_id = p_scenario_b_id THEN total_cost ELSE 0 END) -
         MAX(CASE WHEN scenario_id = p_scenario_a_id THEN total_cost ELSE 0 END))::decimal,
        CASE
            WHEN MAX(CASE WHEN scenario_id = p_scenario_a_id THEN total_cost ELSE 0 END) > 0
            THEN ((MAX(CASE WHEN scenario_id = p_scenario_b_id THEN total_cost ELSE 0 END) -
                   MAX(CASE WHEN scenario_id = p_scenario_a_id THEN total_cost ELSE 0 END))::decimal /
                   MAX(CASE WHEN scenario_id = p_scenario_a_id THEN total_cost ELSE 0 END) * 100)::decimal(5,2)
            ELSE 0
        END,
        CASE
            WHEN MAX(CASE WHEN scenario_id = p_scenario_b_id THEN total_cost ELSE 0 END) <
                 MAX(CASE WHEN scenario_id = p_scenario_a_id THEN total_cost ELSE 0 END)
            THEN p_scenario_b_id
            ELSE p_scenario_a_id
        END
    FROM scenario_metrics;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Function to apply scenario to actual allocations
CREATE OR REPLACE FUNCTION apply_scenario_to_allocations(
    p_scenario_id UUID,
    p_applied_by UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_scenario_status scenario_status;
    v_success BOOLEAN := false;
BEGIN
    -- Check scenario status
    SELECT scenario_status INTO v_scenario_status
    FROM planning_scenarios
    WHERE id = p_scenario_id;

    IF v_scenario_status != 'approved' THEN
        RAISE EXCEPTION 'Scenario must be approved before applying';
    END IF;

    -- Start transaction
    BEGIN
        -- Mark existing allocations as inactive if they are being replaced
        UPDATE resource_allocations ra
        SET is_active = false,
            updated_at = CURRENT_TIMESTAMP
        FROM scenario_allocations sa
        WHERE sa.scenario_id = p_scenario_id
          AND sa.original_allocation_id = ra.id
          AND sa.is_modification = true;

        -- Insert new allocations from scenario
        INSERT INTO resource_allocations (
            employee_id, project_id, start_date, end_date,
            allocated_hours, billable_rate, is_active,
            created_at, updated_at
        )
        SELECT
            sa.employee_id, sa.project_id, sa.start_date, sa.end_date,
            sa.allocated_hours, sa.billable_rate, true,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        FROM scenario_allocations sa
        WHERE sa.scenario_id = p_scenario_id
          AND (sa.is_new_allocation = true OR sa.is_modification = true);

        -- Update scenario status
        UPDATE planning_scenarios
        SET scenario_status = 'applied',
            applied_by = p_applied_by,
            applied_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_scenario_id;

        -- Log the action
        INSERT INTO scenario_audit_log (
            scenario_id, action, performed_by, changes
        ) VALUES (
            p_scenario_id, 'applied', p_applied_by,
            jsonb_build_object('status', 'applied', 'timestamp', CURRENT_TIMESTAMP)
        );

        v_success := true;
    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback will happen automatically
            RAISE;
    END;

    RETURN v_success;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- ============================================
-- CREATE VIEWS
-- ============================================

-- View for active scenarios with summary metrics
CREATE OR REPLACE VIEW v_active_scenarios_summary AS
SELECT
    ps.id,
    ps.name,
    ps.description,
    ps.scenario_status,
    ps.priority,
    ps.start_date,
    ps.end_date,
    CONCAT(e_creator.first_name, ' ', e_creator.last_name) as created_by_name,
    CONCAT(e_owner.first_name, ' ', e_owner.last_name) as owned_by_name,
    COUNT(DISTINCT sa.employee_id) as total_resources,
    COUNT(DISTINCT sa.project_id) as total_projects,
    COALESCE(SUM(sa.total_hours), 0) as total_hours,
    COALESCE(SUM(sa.total_cost), 0) as total_cost,
    COUNT(CASE WHEN sa.has_conflict THEN 1 END) as conflict_count,
    sia.overall_severity as latest_impact_severity,
    ps.created_at,
    ps.updated_at
FROM planning_scenarios ps
LEFT JOIN employees e_creator ON e_creator.id = ps.created_by
LEFT JOIN employees e_owner ON e_owner.id = ps.owned_by
LEFT JOIN scenario_allocations sa ON sa.scenario_id = ps.id
LEFT JOIN LATERAL (
    SELECT overall_severity
    FROM scenario_impact_analysis
    WHERE scenario_id = ps.id
    ORDER BY analysis_timestamp DESC
    LIMIT 1
) sia ON true
WHERE ps.scenario_status NOT IN ('archived', 'applied')
GROUP BY
    ps.id, ps.name, ps.description, ps.scenario_status, ps.priority,
    ps.start_date, ps.end_date, ps.created_at, ps.updated_at,
    e_creator.first_name, e_creator.last_name,
    e_owner.first_name, e_owner.last_name,
    sia.overall_severity;

-- ============================================
-- SEED INITIAL DATA (Optional)
-- ============================================

-- Add comments for documentation
COMMENT ON TABLE planning_scenarios IS
'Master table for what-if scenario planning. Tracks different allocation scenarios for capacity planning and impact analysis.';

COMMENT ON TABLE scenario_allocations IS
'Resource allocations within a planning scenario. Allows testing different allocation strategies without affecting actual data.';

COMMENT ON TABLE scenario_impact_analysis IS
'Stores the results of impact analysis for scenarios, including capacity, cost, and resource utilization metrics.';

COMMENT ON TABLE scenario_comparison_results IS
'Stores comparison metrics between two scenarios to help with decision making.';

COMMENT ON FUNCTION analyze_scenario_capacity IS
'Analyzes the capacity impact of a scenario, showing utilization changes for each affected employee and date.';

COMMENT ON FUNCTION compare_scenarios IS
'Compares two scenarios across multiple dimensions including cost, resources, and utilization.';

COMMENT ON FUNCTION apply_scenario_to_allocations IS
'Applies an approved scenario to actual resource allocations. Must be approved status. Creates audit log.';

-- ============================================
-- ROLLBACK SCRIPT (DOWN MIGRATION)
-- ============================================

/*
-- To rollback this migration, run:

-- Drop views
DROP VIEW IF EXISTS v_active_scenarios_summary;

-- Drop functions
DROP FUNCTION IF EXISTS apply_scenario_to_allocations(UUID, UUID);
DROP FUNCTION IF EXISTS compare_scenarios(UUID, UUID);
DROP FUNCTION IF EXISTS analyze_scenario_capacity(UUID);

-- Drop triggers
DROP TRIGGER IF EXISTS trg_planning_scenarios_updated_at ON planning_scenarios;
DROP TRIGGER IF EXISTS trg_scenario_allocations_updated_at ON scenario_allocations;

-- Drop indexes
DROP INDEX IF EXISTS idx_scenarios_status;
DROP INDEX IF EXISTS idx_scenarios_owner;
DROP INDEX IF EXISTS idx_scenarios_date_range;
DROP INDEX IF EXISTS idx_scenarios_priority_status;
DROP INDEX IF EXISTS idx_scenarios_parent;
DROP INDEX IF EXISTS idx_scenarios_approval_pending;
DROP INDEX IF EXISTS idx_scenario_allocations_scenario;
DROP INDEX IF EXISTS idx_scenario_allocations_employee;
DROP INDEX IF EXISTS idx_scenario_allocations_project;
DROP INDEX IF EXISTS idx_scenario_allocations_dates;
DROP INDEX IF EXISTS idx_scenario_allocations_conflicts;
DROP INDEX IF EXISTS idx_scenario_allocations_original;
DROP INDEX IF EXISTS idx_impact_scenario;
DROP INDEX IF EXISTS idx_impact_severity;
DROP INDEX IF EXISTS idx_impact_recent;
DROP INDEX IF EXISTS idx_comparison_scenarios;
DROP INDEX IF EXISTS idx_comparison_type;
DROP INDEX IF EXISTS idx_audit_scenario;
DROP INDEX IF EXISTS idx_audit_user;
DROP INDEX IF EXISTS idx_audit_action;
DROP INDEX IF EXISTS idx_scenarios_constraints_gin;
DROP INDEX IF EXISTS idx_scenarios_optimization_gin;
DROP INDEX IF EXISTS idx_allocations_conflicts_gin;
DROP INDEX IF EXISTS idx_impact_details_gin;
DROP INDEX IF EXISTS idx_impact_recommendations_gin;

-- Drop tables (in dependency order)
DROP TABLE IF EXISTS scenario_audit_log;
DROP TABLE IF EXISTS scenario_comparison_results;
DROP TABLE IF EXISTS scenario_impact_analysis;
DROP TABLE IF EXISTS scenario_allocations;
DROP TABLE IF EXISTS planning_scenarios;

-- Drop enum types
DROP TYPE IF EXISTS comparison_result_type;
DROP TYPE IF EXISTS impact_severity;
DROP TYPE IF EXISTS scenario_priority;
DROP TYPE IF EXISTS scenario_status;

*/
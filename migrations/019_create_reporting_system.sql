-- Migration: Create comprehensive reporting and analytics system
-- Purpose: Add tables and functions to support advanced reporting capabilities

-- Create report configurations table for persistent report settings
CREATE TABLE IF NOT EXISTS report_configurations (
    id VARCHAR(36) PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(100) NOT NULL CHECK (
        report_type IN (
            'utilization_report', 'burn_down_chart', 'department_analytics',
            'executive_dashboard', 'trend_analysis', 'comparison_report',
            'custom_report'
        )
    ),
    configuration JSON NOT NULL, -- Stores filter settings, chart configs, etc.
    created_by VARCHAR(36), -- User who created the report
    is_public BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    schedule_frequency VARCHAR(50), -- 'daily', 'weekly', 'monthly', null for on-demand
    next_run_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create report executions table to track report generation history
CREATE TABLE IF NOT EXISTS report_executions (
    id VARCHAR(36) PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    report_config_id VARCHAR(36) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    execution_time_ms INTEGER,
    data_points INTEGER,
    file_path VARCHAR(500), -- Path to generated report file
    format VARCHAR(10) CHECK (format IN ('pdf', 'csv', 'json', 'png')),
    error_message TEXT,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_config_id) REFERENCES report_configurations(id) ON DELETE CASCADE
);

-- Create capacity snapshots table for historical capacity tracking
CREATE TABLE IF NOT EXISTS capacity_snapshots (
    id VARCHAR(36) PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    snapshot_date DATE NOT NULL,
    employee_id VARCHAR(36) NOT NULL,
    department_id VARCHAR(36),
    available_hours DECIMAL(10,2) DEFAULT 40.0,
    allocated_hours DECIMAL(10,2) DEFAULT 0.0,
    utilization_rate DECIMAL(5,2) DEFAULT 0.0,
    active_projects INTEGER DEFAULT 0,
    skill_coverage_score DECIMAL(5,2) DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Create project budget tracking table for burn-down charts
CREATE TABLE IF NOT EXISTS project_budget_snapshots (
    id VARCHAR(36) PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    project_id VARCHAR(36) NOT NULL,
    snapshot_date DATE NOT NULL,
    planned_budget DECIMAL(15,2),
    actual_spend DECIMAL(15,2) DEFAULT 0.0,
    planned_hours DECIMAL(10,2),
    actual_hours DECIMAL(10,2) DEFAULT 0.0,
    completion_percentage DECIMAL(5,2) DEFAULT 0.0,
    burn_rate DECIMAL(15,2), -- Daily spend rate
    estimated_completion_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, snapshot_date)
);

-- Create department performance metrics table
CREATE TABLE IF NOT EXISTS department_performance_metrics (
    id VARCHAR(36) PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    department_id VARCHAR(36) NOT NULL,
    metric_date DATE NOT NULL,
    employee_count INTEGER DEFAULT 0,
    average_utilization DECIMAL(5,2) DEFAULT 0.0,
    efficiency_score DECIMAL(5,2) DEFAULT 0.0,
    skill_diversity DECIMAL(5,2) DEFAULT 0.0,
    team_satisfaction_score DECIMAL(5,2) DEFAULT 0.0,
    project_completion_rate DECIMAL(5,2) DEFAULT 0.0,
    revenue_per_employee DECIMAL(15,2) DEFAULT 0.0,
    client_satisfaction_score DECIMAL(5,2) DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    UNIQUE(department_id, metric_date)
);

-- Create time entries table for detailed time tracking (if not exists)
CREATE TABLE IF NOT EXISTS time_entries (
    id VARCHAR(36) PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    employee_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36) NOT NULL,
    allocation_id VARCHAR(36), -- Links to resource allocations
    entry_date DATE NOT NULL,
    hours_worked DECIMAL(5,2) NOT NULL,
    description TEXT,
    billable_hours DECIMAL(5,2) DEFAULT 0.0,
    hourly_rate DECIMAL(10,2),
    activity_type VARCHAR(100), -- 'development', 'meeting', 'planning', etc.
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by VARCHAR(36),
    approved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_report_configs_type ON report_configurations(report_type);
CREATE INDEX IF NOT EXISTS idx_report_configs_active ON report_configurations(is_active);
CREATE INDEX IF NOT EXISTS idx_report_executions_config ON report_executions(report_config_id);
CREATE INDEX IF NOT EXISTS idx_report_executions_status ON report_executions(status);

CREATE INDEX IF NOT EXISTS idx_capacity_snapshots_date ON capacity_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_capacity_snapshots_employee ON capacity_snapshots(employee_id);
CREATE INDEX IF NOT EXISTS idx_capacity_snapshots_dept_date ON capacity_snapshots(department_id, snapshot_date);

CREATE INDEX IF NOT EXISTS idx_budget_snapshots_project ON project_budget_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_snapshots_date ON project_budget_snapshots(snapshot_date);

CREATE INDEX IF NOT EXISTS idx_dept_metrics_dept_date ON department_performance_metrics(department_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_dept_metrics_date ON department_performance_metrics(metric_date);

CREATE INDEX IF NOT EXISTS idx_time_entries_employee_date ON time_entries(employee_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_project_date ON time_entries(project_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_allocation ON time_entries(allocation_id);

-- Create views for common report queries
CREATE VIEW IF NOT EXISTS v_employee_utilization_summary AS
SELECT 
    e.id as employee_id,
    e.first_name || ' ' || e.last_name as employee_name,
    d.name as department_name,
    cs.snapshot_date,
    cs.available_hours,
    cs.allocated_hours,
    cs.utilization_rate,
    cs.active_projects,
    cs.skill_coverage_score,
    CASE 
        WHEN cs.utilization_rate > 100 THEN 'over-allocated'
        WHEN cs.utilization_rate >= 80 THEN 'fully-utilized'
        WHEN cs.utilization_rate >= 60 THEN 'well-utilized'
        ELSE 'under-utilized'
    END as utilization_category
FROM employees e
JOIN capacity_snapshots cs ON e.id = cs.employee_id
JOIN departments d ON e.department_id = d.id
WHERE e.is_active = 1;

CREATE VIEW IF NOT EXISTS v_project_burn_down AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.client_name,
    pbs.snapshot_date,
    pbs.planned_budget,
    pbs.actual_spend,
    pbs.planned_hours,
    pbs.actual_hours,
    pbs.completion_percentage,
    pbs.burn_rate,
    pbs.estimated_completion_date,
    p.end_date as planned_end_date,
    CASE 
        WHEN pbs.actual_spend > pbs.planned_budget THEN 'over-budget'
        WHEN pbs.actual_spend > (pbs.planned_budget * 0.8) THEN 'approaching-budget'
        ELSE 'on-budget'
    END as budget_status,
    CASE 
        WHEN pbs.estimated_completion_date > p.end_date THEN 'behind-schedule'
        WHEN pbs.estimated_completion_date = p.end_date THEN 'on-schedule'
        ELSE 'ahead-of-schedule'
    END as schedule_status
FROM projects p
JOIN project_budget_snapshots pbs ON p.id = pbs.project_id
WHERE p.status != 'deleted';

CREATE VIEW IF NOT EXISTS v_department_performance AS
SELECT 
    d.id as department_id,
    d.name as department_name,
    dpm.metric_date,
    dpm.employee_count,
    dpm.average_utilization,
    dpm.efficiency_score,
    dpm.skill_diversity,
    dpm.team_satisfaction_score,
    dpm.project_completion_rate,
    dpm.revenue_per_employee,
    dpm.client_satisfaction_score,
    CASE 
        WHEN dpm.efficiency_score >= 90 THEN 'excellent'
        WHEN dpm.efficiency_score >= 80 THEN 'good'
        WHEN dpm.efficiency_score >= 70 THEN 'average'
        ELSE 'needs-improvement'
    END as performance_category
FROM departments d
JOIN department_performance_metrics dpm ON d.id = dpm.department_id
WHERE d.is_active = 1;

-- Create function to calculate resource demand forecast
-- Note: This is a simplified version - in production you'd use ML models
CREATE VIEW IF NOT EXISTS v_resource_demand_forecast AS
WITH monthly_allocation_trends AS (
    SELECT 
        strftime('%Y-%m', start_date) as month,
        COUNT(*) as allocation_count,
        AVG(allocated_hours) as avg_hours,
        COUNT(DISTINCT employee_id) as unique_employees,
        COUNT(DISTINCT project_id) as unique_projects
    FROM resource_allocations 
    WHERE start_date >= date('now', '-12 months')
    AND status IN ('active', 'confirmed', 'completed')
    GROUP BY strftime('%Y-%m', start_date)
),
trend_analysis AS (
    SELECT 
        month,
        allocation_count,
        avg_hours,
        unique_employees,
        unique_projects,
        LAG(allocation_count) OVER (ORDER BY month) as prev_allocation_count,
        LAG(avg_hours) OVER (ORDER BY month) as prev_avg_hours
    FROM monthly_allocation_trends
)
SELECT 
    month,
    allocation_count,
    avg_hours,
    unique_employees,
    unique_projects,
    CASE 
        WHEN prev_allocation_count > 0 THEN 
            ((allocation_count - prev_allocation_count) * 1.0 / prev_allocation_count) * 100
        ELSE 0 
    END as allocation_growth_rate,
    CASE 
        WHEN prev_avg_hours > 0 THEN 
            ((avg_hours - prev_avg_hours) * 1.0 / prev_avg_hours) * 100
        ELSE 0 
    END as hours_growth_rate
FROM trend_analysis
WHERE prev_allocation_count IS NOT NULL;

-- Insert some sample report configurations
INSERT OR IGNORE INTO report_configurations (id, name, description, report_type, configuration, is_public) VALUES
('rpt-util-weekly', 'Weekly Utilization Report', 'Weekly employee utilization summary with trends', 'utilization_report', 
 '{"dateRange":"weekly","includeDetails":true,"departments":"all","chartTypes":["bar","line"],"exportFormat":"pdf"}', TRUE),

('rpt-exec-dashboard', 'Executive KPI Dashboard', 'High-level KPIs for executive review', 'executive_dashboard', 
 '{"kpis":["utilization","capacity","conflicts","budget"],"refreshInterval":3600,"realTime":true}', TRUE),

('rpt-burndown-active', 'Active Projects Burn-down', 'Budget and timeline burn-down for all active projects', 'burn_down_chart', 
 '{"projectStatus":["active","in-progress"],"includeForecasts":true,"alertThresholds":{"budget":90,"schedule":110}}', TRUE),

('rpt-dept-comparison', 'Department Performance Comparison', 'Compare department metrics and performance', 'comparison_report', 
 '{"compareAll":true,"metrics":["utilization","efficiency","satisfaction","completion"],"period":"monthly"}', TRUE);

-- Create triggers to automatically update timestamps
CREATE TRIGGER IF NOT EXISTS update_report_configurations_timestamp
    AFTER UPDATE ON report_configurations
    FOR EACH ROW
BEGIN
    UPDATE report_configurations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_time_entries_timestamp
    AFTER UPDATE ON time_entries
    FOR EACH ROW
BEGIN
    UPDATE time_entries SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
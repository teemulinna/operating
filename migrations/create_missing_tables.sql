-- Create missing tables for capacity intelligence service

-- Create capacity_metrics_snapshots table
CREATE TABLE IF NOT EXISTS capacity_metrics_snapshots (
    id SERIAL PRIMARY KEY,
    metric_date DATE NOT NULL,
    overall_utilization DECIMAL(5,2),
    department_utilization JSONB,
    skill_utilization JSONB,
    total_capacity_hours INTEGER,
    allocated_hours INTEGER,
    available_hours INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create capacity_predictions table
CREATE TABLE IF NOT EXISTS capacity_predictions (
    id SERIAL PRIMARY KEY,
    prediction_date DATE NOT NULL,
    horizon VARCHAR(20),
    scenario VARCHAR(20),
    predicted_capacity INTEGER,
    demand_forecast INTEGER,
    utilization_rate DECIMAL(5,2),
    confidence DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create capacity_bottlenecks table
CREATE TABLE IF NOT EXISTS capacity_bottlenecks (
    id SERIAL PRIMARY KEY,
    identified_date DATE NOT NULL,
    type VARCHAR(50),
    severity VARCHAR(20),
    description TEXT,
    impact DECIMAL(5,2),
    affected_resources JSONB,
    recommendations JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to employees table if they don't exist
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS weekly_capacity_hours INTEGER DEFAULT 40;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS weekly_hours INTEGER DEFAULT 40;

-- Add missing columns to projects table if they don't exist
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Add missing columns to allocations table if they don't exist
ALTER TABLE allocations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE allocations ADD COLUMN IF NOT EXISTS project_role_id INTEGER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_capacity_metrics_date ON capacity_metrics_snapshots(metric_date);
CREATE INDEX IF NOT EXISTS idx_capacity_predictions_date ON capacity_predictions(prediction_date);
CREATE INDEX IF NOT EXISTS idx_capacity_bottlenecks_date ON capacity_bottlenecks(identified_date);

-- Insert sample data for testing
INSERT INTO capacity_metrics_snapshots (metric_date, overall_utilization, department_utilization, skill_utilization, total_capacity_hours, allocated_hours, available_hours)
VALUES
    (CURRENT_DATE - INTERVAL '7 days', 75.5, '{"Engineering": 80, "Design": 70}', '{"React": 85, "Node.js": 75}', 1600, 1208, 392),
    (CURRENT_DATE - INTERVAL '14 days', 72.3, '{"Engineering": 78, "Design": 65}', '{"React": 82, "Node.js": 72}', 1600, 1157, 443),
    (CURRENT_DATE, 78.2, '{"Engineering": 82, "Design": 73}', '{"React": 87, "Node.js": 78}', 1600, 1251, 349)
ON CONFLICT DO NOTHING;
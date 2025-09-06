-- Migration: Add availability tracking and export scheduling tables
-- Version: 008
-- Date: 2024-09-05

-- Create employee availability tracking table
CREATE TABLE IF NOT EXISTS employee_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'busy', 'unavailable')),
    capacity INTEGER NOT NULL DEFAULT 100 CHECK (capacity >= 0 AND capacity <= 100),
    current_projects INTEGER NOT NULL DEFAULT 0 CHECK (current_projects >= 0),
    available_hours INTEGER NOT NULL DEFAULT 40 CHECK (available_hours >= 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id)
);

-- Create indexes for employee availability
CREATE INDEX idx_employee_availability_employee_id ON employee_availability(employee_id);
CREATE INDEX idx_employee_availability_status ON employee_availability(status);
CREATE INDEX idx_employee_availability_capacity ON employee_availability(capacity);
CREATE INDEX idx_employee_availability_updated_at ON employee_availability(updated_at);

-- Create report schedules table for automated reporting
CREATE TABLE IF NOT EXISTS report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type VARCHAR(100) NOT NULL,
    frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly')),
    format VARCHAR(20) NOT NULL CHECK (format IN ('csv', 'excel', 'pdf')),
    recipients TEXT NOT NULL, -- JSON array of email addresses
    filters TEXT, -- JSON object of filter criteria
    next_run TIMESTAMP WITH TIME ZONE NOT NULL,
    last_run TIMESTAMP WITH TIME ZONE,
    run_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for report schedules
CREATE INDEX idx_report_schedules_next_run ON report_schedules(next_run);
CREATE INDEX idx_report_schedules_is_active ON report_schedules(is_active);
CREATE INDEX idx_report_schedules_frequency ON report_schedules(frequency);

-- Create external sync log table for tracking integrations
CREATE TABLE IF NOT EXISTS external_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_systems TEXT NOT NULL, -- JSON array of system names
    sync_type VARCHAR(100) NOT NULL,
    sync_data TEXT, -- JSON object of sync data
    results TEXT, -- JSON object of sync results
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for external sync log
CREATE INDEX idx_external_sync_log_created_at ON external_sync_log(created_at);
CREATE INDEX idx_external_sync_log_status ON external_sync_log(status);
CREATE INDEX idx_external_sync_log_sync_type ON external_sync_log(sync_type);

-- Create real-time updates log for WebSocket tracking
CREATE TABLE IF NOT EXISTS realtime_updates_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    update_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    change_data TEXT, -- JSON object of changes
    broadcast_to TEXT, -- JSON array of connection IDs that received the update
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for real-time updates log
CREATE INDEX idx_realtime_updates_log_created_at ON realtime_updates_log(created_at);
CREATE INDEX idx_realtime_updates_log_entity_type ON realtime_updates_log(entity_type);
CREATE INDEX idx_realtime_updates_log_entity_id ON realtime_updates_log(entity_id);

-- Create export history table for tracking exports
CREATE TABLE IF NOT EXISTS export_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    export_type VARCHAR(50) NOT NULL,
    format VARCHAR(20) NOT NULL,
    filters TEXT, -- JSON object of filter criteria used
    fields TEXT, -- JSON array of fields exported
    record_count INTEGER,
    file_size BIGINT,
    file_path TEXT,
    created_by UUID, -- Could reference a users table in future
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for export history
CREATE INDEX idx_export_history_created_at ON export_history(created_at);
CREATE INDEX idx_export_history_export_type ON export_history(export_type);
CREATE INDEX idx_export_history_status ON export_history(status);
CREATE INDEX idx_export_history_expires_at ON export_history(expires_at);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_employee_availability_updated_at 
    BEFORE UPDATE ON employee_availability 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_schedules_updated_at 
    BEFORE UPDATE ON report_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample availability data for existing employees
DO $$
DECLARE
    emp_record RECORD;
    statuses TEXT[] := ARRAY['available', 'busy', 'unavailable'];
    random_status TEXT;
    random_capacity INTEGER;
    random_projects INTEGER;
    random_hours INTEGER;
BEGIN
    -- Insert availability records for existing employees
    FOR emp_record IN SELECT id FROM employees WHERE is_active = true LOOP
        -- Generate random but realistic data
        random_status := statuses[1 + (random() * (array_length(statuses, 1) - 1))::integer];
        random_capacity := 60 + (random() * 40)::integer; -- 60-100%
        random_projects := (random() * 4)::integer; -- 0-4 projects
        
        -- Available hours based on status and capacity
        CASE random_status
            WHEN 'available' THEN
                random_hours := (random_capacity * 0.4)::integer; -- Up to 40% of capacity as available hours
            WHEN 'busy' THEN
                random_hours := (random_capacity * 0.1)::integer; -- Very few available hours
            WHEN 'unavailable' THEN
                random_hours := 0;
        END CASE;
        
        INSERT INTO employee_availability (
            employee_id, 
            status, 
            capacity, 
            current_projects, 
            available_hours,
            notes
        ) VALUES (
            emp_record.id,
            random_status,
            random_capacity,
            random_projects,
            random_hours,
            CASE random_status
                WHEN 'busy' THEN 'Currently working on multiple high-priority projects'
                WHEN 'unavailable' THEN 'Out of office or on leave'
                ELSE 'Ready to take on new assignments'
            END
        ) ON CONFLICT (employee_id) DO NOTHING;
    END LOOP;
END $$;

-- Create view for employee availability summary
CREATE OR REPLACE VIEW employee_availability_summary AS
SELECT 
    e.id,
    e.first_name,
    e.last_name,
    e.email,
    e.position,
    d.name as department_name,
    COALESCE(ea.status, 'available') as status,
    COALESCE(ea.capacity, 100) as capacity,
    COALESCE(ea.current_projects, 0) as current_projects,
    COALESCE(ea.available_hours, 40) as available_hours,
    COALESCE(ea.updated_at, e.created_at) as last_updated,
    e.is_active
FROM employees e
JOIN departments d ON e.department_id = d.id
LEFT JOIN employee_availability ea ON e.id = ea.employee_id
WHERE e.is_active = true;

-- Create view for department utilization metrics
CREATE OR REPLACE VIEW department_utilization_metrics AS
SELECT 
    d.id as department_id,
    d.name as department_name,
    COUNT(e.id) as total_employees,
    COUNT(*) FILTER (WHERE COALESCE(ea.status, 'available') = 'available') as available_employees,
    COUNT(*) FILTER (WHERE COALESCE(ea.status, 'available') = 'busy') as busy_employees,
    COUNT(*) FILTER (WHERE COALESCE(ea.status, 'available') = 'unavailable') as unavailable_employees,
    ROUND(AVG(COALESCE(ea.capacity, 100))::numeric, 1) as average_capacity,
    SUM(COALESCE(ea.available_hours, 40)) as total_available_hours,
    SUM(COALESCE(ea.current_projects, 0)) as total_current_projects
FROM departments d
LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
LEFT JOIN employee_availability ea ON e.id = ea.employee_id
WHERE d.is_active = true
GROUP BY d.id, d.name
ORDER BY d.name;

-- Add some comments for documentation
COMMENT ON TABLE employee_availability IS 'Tracks real-time availability status and capacity for each employee';
COMMENT ON TABLE report_schedules IS 'Stores automated report scheduling configuration';
COMMENT ON TABLE external_sync_log IS 'Logs all external system synchronization attempts and results';
COMMENT ON TABLE realtime_updates_log IS 'Tracks real-time updates broadcast via WebSocket';
COMMENT ON TABLE export_history IS 'History of all data exports with metadata';

COMMENT ON COLUMN employee_availability.status IS 'Current availability status: available, busy, or unavailable';
COMMENT ON COLUMN employee_availability.capacity IS 'Current capacity percentage (0-100)';
COMMENT ON COLUMN employee_availability.available_hours IS 'Available hours per week';
COMMENT ON COLUMN report_schedules.recipients IS 'JSON array of email addresses to send reports to';
COMMENT ON COLUMN report_schedules.filters IS 'JSON object containing filter criteria for the report';

-- Create function for capacity utilization calculation
CREATE OR REPLACE FUNCTION calculate_team_utilization(dept_id UUID)
RETURNS TABLE (
    department_name TEXT,
    total_capacity INTEGER,
    used_capacity INTEGER,
    utilization_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.name::TEXT,
        SUM(COALESCE(ea.capacity, 100))::INTEGER as total_capacity,
        SUM(COALESCE(ea.capacity, 100) * COALESCE(ea.current_projects, 0) / 4)::INTEGER as used_capacity,
        ROUND(
            (SUM(COALESCE(ea.capacity, 100) * COALESCE(ea.current_projects, 0) / 4) * 100.0 / 
             NULLIF(SUM(COALESCE(ea.capacity, 100)), 0))::numeric, 
            1
        ) as utilization_percentage
    FROM departments d
    LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
    LEFT JOIN employee_availability ea ON e.id = ea.employee_id
    WHERE d.id = dept_id AND d.is_active = true
    GROUP BY d.id, d.name;
END;
$$ LANGUAGE plpgsql;

-- Insert sample report schedule for demo
INSERT INTO report_schedules (
    report_type,
    frequency,
    format,
    recipients,
    filters,
    next_run
) VALUES (
    'capacity_summary',
    'weekly',
    'pdf',
    '["manager@company.com", "hr@company.com"]',
    '{"departmentId": null, "includeCharts": true}',
    CURRENT_TIMESTAMP + INTERVAL '7 days'
) ON CONFLICT DO NOTHING;

-- Create indexes for performance optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_availability_composite 
ON employee_availability(status, capacity DESC, available_hours DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_department_active 
ON employees(department_id, is_active) WHERE is_active = true;

-- Grant permissions (adjust as needed for your application)
-- GRANT SELECT, INSERT, UPDATE ON employee_availability TO application_user;
-- GRANT SELECT, INSERT, UPDATE ON report_schedules TO application_user;
-- GRANT SELECT, INSERT ON external_sync_log TO application_user;
-- GRANT SELECT, INSERT ON realtime_updates_log TO application_user;
-- GRANT SELECT, INSERT ON export_history TO application_user;

COMMIT;
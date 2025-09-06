-- Migration: Create Projects Table
-- Created: 2025-09-06  
-- Purpose: Core projects table for project-resource integration
-- Dependencies: 006_create_project_enums.sql

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    client_name VARCHAR(200),
    start_date DATE NOT NULL,
    end_date DATE,
    status project_status NOT NULL DEFAULT 'planning',
    priority project_priority NOT NULL DEFAULT 'medium',
    budget DECIMAL(12,2),
    currency_code VARCHAR(3) DEFAULT 'USD',
    estimated_hours INTEGER,
    actual_hours DECIMAL(8,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    
    -- Business rule constraints
    CONSTRAINT chk_project_dates CHECK (end_date IS NULL OR start_date <= end_date),
    CONSTRAINT chk_project_budget CHECK (budget IS NULL OR budget >= 0),
    CONSTRAINT chk_project_hours CHECK (estimated_hours IS NULL OR estimated_hours > 0),
    CONSTRAINT chk_project_actual_hours CHECK (actual_hours >= 0),
    CONSTRAINT chk_project_code_format CHECK (code ~ '^[A-Z0-9-]{3,20}$'),
    CONSTRAINT chk_project_currency CHECK (currency_code IN ('USD', 'EUR', 'GBP', 'CAD')),
    CONSTRAINT chk_project_start_date CHECK (start_date >= '2020-01-01' AND start_date <= CURRENT_DATE + INTERVAL '2 years')
);

-- Performance indexes
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_priority ON projects(priority);
CREATE INDEX idx_projects_dates ON projects(start_date, end_date);
CREATE INDEX idx_projects_code ON projects(code);
CREATE INDEX idx_projects_client ON projects(client_name);
CREATE INDEX idx_projects_active ON projects(status, start_date) WHERE status IN ('planning', 'active');

-- Full-text search index
CREATE INDEX idx_projects_search ON projects USING gin(
    to_tsvector('english', 
        name || ' ' || 
        coalesce(description, '') || ' ' || 
        code || ' ' ||
        coalesce(client_name, '')
    )
);

-- Partial index for active projects (most common queries)
CREATE INDEX idx_projects_active_search ON projects(name, code, start_date) 
WHERE status IN ('planning', 'active');

-- Trigger for automatic updated_at timestamp
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE projects IS 'Central table for project management and resource planning';
COMMENT ON COLUMN projects.code IS 'Human-readable project code (e.g., PROJ-2025-001)';
COMMENT ON COLUMN projects.estimated_hours IS 'Total estimated hours for project completion';
COMMENT ON COLUMN projects.actual_hours IS 'Actual hours tracked against the project';
COMMENT ON COLUMN projects.budget IS 'Total project budget in specified currency';
COMMENT ON COLUMN projects.currency_code IS 'ISO currency code (USD, EUR, GBP, CAD)';
COMMENT ON COLUMN projects.client_name IS 'Client name for external projects';
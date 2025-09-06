-- Migration: 007_create_projects_table
-- Description: Create projects table for project management

-- Create projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status project_status NOT NULL DEFAULT 'planning',
    priority priority_level NOT NULL DEFAULT 'medium',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(12,2) CHECK (budget >= 0),
    estimated_hours INTEGER CHECK (estimated_hours >= 0),
    actual_hours INTEGER DEFAULT 0 CHECK (actual_hours >= 0),
    client_id UUID, -- Optional: for client projects
    department_id UUID, -- Department responsible for the project
    project_manager_id UUID, -- Employee managing the project
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_projects_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    CONSTRAINT fk_projects_manager FOREIGN KEY (project_manager_id) REFERENCES employees(id) ON DELETE SET NULL,
    
    -- Business logic constraints
    CONSTRAINT chk_projects_dates CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date),
    CONSTRAINT chk_projects_name_length CHECK (LENGTH(TRIM(name)) >= 3),
    
    -- Unique constraint for active projects with same name
    CONSTRAINT uk_projects_name_active UNIQUE (name) WHERE is_active = true
);

-- Create indexes for performance
CREATE INDEX idx_projects_name ON projects(name);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_priority ON projects(priority);
CREATE INDEX idx_projects_dates ON projects(start_date, end_date);
CREATE INDEX idx_projects_status_dates ON projects(status, start_date, end_date);
CREATE INDEX idx_projects_department_id ON projects(department_id);
CREATE INDEX idx_projects_manager_id ON projects(project_manager_id);
CREATE INDEX idx_projects_is_active ON projects(is_active);
CREATE INDEX idx_projects_completion ON projects(completion_percentage);
CREATE INDEX idx_projects_budget ON projects(budget);

-- Partial indexes for performance optimization
CREATE INDEX idx_projects_active ON projects(name, status) WHERE is_active = true;
CREATE INDEX idx_projects_ongoing ON projects(id, name, status) 
    WHERE status IN ('planning', 'active') AND is_active = true;

-- Create trigger for updated_at
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE projects IS 'Core projects table for project management system';
COMMENT ON COLUMN projects.name IS 'Project name, must be unique for active projects';
COMMENT ON COLUMN projects.status IS 'Current status of the project';
COMMENT ON COLUMN projects.priority IS 'Business priority level of the project';
COMMENT ON COLUMN projects.budget IS 'Total budget allocated for the project';
COMMENT ON COLUMN projects.estimated_hours IS 'Estimated total hours to complete the project';
COMMENT ON COLUMN projects.actual_hours IS 'Actual hours spent on the project (calculated from assignments)';
COMMENT ON COLUMN projects.completion_percentage IS 'Project completion percentage (0-100)';
COMMENT ON COLUMN projects.project_manager_id IS 'Employee responsible for managing the project';
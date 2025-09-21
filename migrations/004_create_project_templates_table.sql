-- Create project_templates table
CREATE TABLE IF NOT EXISTS project_templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  default_tasks JSONB NOT NULL DEFAULT '[]',
  default_milestones JSONB NOT NULL DEFAULT '[]',
  default_budget DECIMAL(15,2),
  default_duration INTEGER, -- in days
  required_skills JSONB NOT NULL DEFAULT '[]',
  default_team_size INTEGER NOT NULL DEFAULT 1,
  metadata JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_built_in BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT false,
  version INTEGER NOT NULL DEFAULT 1,
  created_by_id UUID,
  usage_count INTEGER NOT NULL DEFAULT 0,
  average_rating DECIMAL(3,2) NOT NULL DEFAULT 0,
  custom_fields JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_templates_category ON project_templates(category);
CREATE INDEX IF NOT EXISTS idx_project_templates_is_active ON project_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_project_templates_is_public ON project_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_project_templates_is_built_in ON project_templates(is_built_in);
CREATE INDEX IF NOT EXISTS idx_project_templates_created_by_id ON project_templates(created_by_id);
CREATE INDEX IF NOT EXISTS idx_project_templates_usage_count ON project_templates(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_project_templates_average_rating ON project_templates(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_project_templates_created_at ON project_templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_templates_updated_at ON project_templates(updated_at DESC);

-- Create GIN indexes for JSONB fields
CREATE INDEX IF NOT EXISTS idx_project_templates_metadata_gin ON project_templates USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_project_templates_default_tasks_gin ON project_templates USING GIN(default_tasks);
CREATE INDEX IF NOT EXISTS idx_project_templates_default_milestones_gin ON project_templates USING GIN(default_milestones);
CREATE INDEX IF NOT EXISTS idx_project_templates_required_skills_gin ON project_templates USING GIN(required_skills);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_project_templates_active_public ON project_templates(is_active, is_public) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_project_templates_active_category ON project_templates(is_active, category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_project_templates_popular ON project_templates(is_active, is_public, usage_count DESC, average_rating DESC) WHERE is_active = true AND is_public = true;

-- Create partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_project_templates_active_templates ON project_templates(template_id, name, category, usage_count, average_rating, created_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_project_templates_public_templates ON project_templates(template_id, name, category, usage_count, average_rating, created_at) WHERE is_active = true AND is_public = true;
CREATE INDEX IF NOT EXISTS idx_project_templates_built_in_templates ON project_templates(template_id, name, category, usage_count, average_rating, created_at) WHERE is_active = true AND is_built_in = true;

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_project_templates_updated_at_trigger ON project_templates;
CREATE TRIGGER update_project_templates_updated_at_trigger
    BEFORE UPDATE ON project_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_project_templates_updated_at();

-- Add foreign key constraint to employees table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
        ALTER TABLE project_templates 
        ADD CONSTRAINT fk_project_templates_created_by 
        FOREIGN KEY (created_by_id) REFERENCES employees(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON project_templates TO CURRENT_USER;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO CURRENT_USER;

-- Add comments for documentation
COMMENT ON TABLE project_templates IS 'Project templates for quick project setup';
COMMENT ON COLUMN project_templates.template_id IS 'Unique identifier for the template';
COMMENT ON COLUMN project_templates.name IS 'Human-readable name of the template';
COMMENT ON COLUMN project_templates.description IS 'Detailed description of the template';
COMMENT ON COLUMN project_templates.category IS 'Category or type of project (e.g., Software Development, Marketing)';
COMMENT ON COLUMN project_templates.default_tasks IS 'JSON array of default tasks for projects created from this template';
COMMENT ON COLUMN project_templates.default_milestones IS 'JSON array of default milestones for projects created from this template';
COMMENT ON COLUMN project_templates.default_budget IS 'Default budget estimate for projects created from this template';
COMMENT ON COLUMN project_templates.default_duration IS 'Default duration in days for projects created from this template';
COMMENT ON COLUMN project_templates.required_skills IS 'JSON array of skills required for this type of project';
COMMENT ON COLUMN project_templates.default_team_size IS 'Recommended team size for projects created from this template';
COMMENT ON COLUMN project_templates.metadata IS 'Additional metadata including industry, complexity, methodology, tags, etc.';
COMMENT ON COLUMN project_templates.is_active IS 'Whether the template is active and available for use';
COMMENT ON COLUMN project_templates.is_built_in IS 'Whether this is a system-provided template';
COMMENT ON COLUMN project_templates.is_public IS 'Whether the template is publicly available to all users';
COMMENT ON COLUMN project_templates.version IS 'Version number of the template for tracking changes';
COMMENT ON COLUMN project_templates.created_by_id IS 'ID of the user who created this template';
COMMENT ON COLUMN project_templates.usage_count IS 'Number of times this template has been used to create projects';
COMMENT ON COLUMN project_templates.average_rating IS 'Average user rating for this template (0-5 scale)';
COMMENT ON COLUMN project_templates.custom_fields IS 'Additional custom fields for extensibility';
COMMENT ON COLUMN project_templates.created_at IS 'Timestamp when the template was created';
COMMENT ON COLUMN project_templates.updated_at IS 'Timestamp when the template was last updated';
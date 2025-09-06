-- Migration: Allocation Templates System
-- Created: 2025-09-06
-- Purpose: Create allocation templates for reusable project patterns
-- Version: PostgreSQL 14 compatible

-- 1. Create template enums
DO $$ 
BEGIN
    -- Create template_category enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'template_category') THEN
        CREATE TYPE template_category AS ENUM (
            'web_development', 'mobile_app', 'consulting', 'research', 
            'data_analytics', 'devops', 'design', 'marketing', 'custom'
        );
    END IF;
    
    -- Create template_status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'template_status') THEN
        CREATE TYPE template_status AS ENUM ('draft', 'active', 'deprecated', 'archived');
    END IF;
    
    -- Create visibility_level enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'visibility_level') THEN
        CREATE TYPE visibility_level AS ENUM ('private', 'organization', 'public');
    END IF;
END $$;

-- 2. Create allocation_templates table
CREATE TABLE IF NOT EXISTS allocation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category template_category NOT NULL DEFAULT 'custom',
    tags TEXT[] DEFAULT '{}',
    
    -- Template metadata
    created_by UUID NOT NULL REFERENCES employees(id),
    organization_id UUID, -- For multi-tenant support
    visibility visibility_level NOT NULL DEFAULT 'private',
    status template_status NOT NULL DEFAULT 'draft',
    
    -- Project defaults
    default_duration_weeks INTEGER,
    default_budget_range DECIMAL(12,2)[2], -- [min, max]
    default_priority project_priority DEFAULT 'medium',
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Versioning
    version INTEGER DEFAULT 1,
    parent_template_id UUID REFERENCES allocation_templates(id),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_template_name CHECK (LENGTH(name) >= 3),
    CONSTRAINT chk_duration CHECK (default_duration_weeks IS NULL OR default_duration_weeks > 0),
    CONSTRAINT chk_version CHECK (version >= 1)
);

-- 3. Create template_roles table
CREATE TABLE IF NOT EXISTS template_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES allocation_templates(id) ON DELETE CASCADE,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Role requirements
    required_skills UUID[] DEFAULT '{}',
    minimum_experience_level experience_level DEFAULT 'junior',
    preferred_skills UUID[] DEFAULT '{}',
    
    -- Allocation details
    planned_allocation_percentage DECIMAL(5,2) NOT NULL 
        CHECK (planned_allocation_percentage > 0 AND planned_allocation_percentage <= 100),
    estimated_hours_per_week DECIMAL(5,2),
    duration_weeks INTEGER,
    
    -- Financial
    hourly_rate_range DECIMAL(8,2)[2], -- [min, max]
    
    -- Assignment settings
    max_assignments INTEGER DEFAULT 1,
    is_critical BOOLEAN DEFAULT false,
    can_be_remote BOOLEAN DEFAULT true,
    
    -- Order for UI display
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_role_allocation CHECK (planned_allocation_percentage <= 100),
    CONSTRAINT chk_role_duration CHECK (duration_weeks IS NULL OR duration_weeks > 0),
    CONSTRAINT chk_role_hours CHECK (estimated_hours_per_week IS NULL OR estimated_hours_per_week >= 0),
    CONSTRAINT chk_max_assignments CHECK (max_assignments >= 1 AND max_assignments <= 10)
);

-- 4. Create template_milestones table
CREATE TABLE IF NOT EXISTS template_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES allocation_templates(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Timing
    week_offset INTEGER NOT NULL, -- Weeks from project start
    duration_weeks INTEGER DEFAULT 1,
    
    -- Resource requirements
    required_roles UUID[] DEFAULT '{}', -- References template_roles.id
    deliverables TEXT[] DEFAULT '{}',
    
    -- Dependencies
    depends_on UUID[] DEFAULT '{}', -- References other milestone IDs
    
    -- Display
    display_order INTEGER DEFAULT 0,
    is_critical BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_milestone_offset CHECK (week_offset >= 0),
    CONSTRAINT chk_milestone_duration CHECK (duration_weeks > 0)
);

-- 5. Create template_customizations table (for organization-specific modifications)
CREATE TABLE IF NOT EXISTS template_customizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES allocation_templates(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    customized_by UUID NOT NULL REFERENCES employees(id),
    
    -- Customization data (JSON)
    role_modifications JSONB DEFAULT '{}',
    milestone_modifications JSONB DEFAULT '{}',
    metadata_modifications JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_org_template UNIQUE(template_id, organization_id)
);

-- 6. Create template_usage_history table
CREATE TABLE IF NOT EXISTS template_usage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES allocation_templates(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    used_by UUID NOT NULL REFERENCES employees(id),
    
    -- Usage details
    customizations_applied JSONB DEFAULT '{}',
    success_rating INTEGER CHECK (success_rating >= 1 AND success_rating <= 5),
    feedback TEXT,
    
    used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_project_template UNIQUE(project_id, template_id)
);

-- 7. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_templates_category ON allocation_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_status ON allocation_templates(status);
CREATE INDEX IF NOT EXISTS idx_templates_visibility ON allocation_templates(visibility);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON allocation_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_templates_usage ON allocation_templates(usage_count DESC, last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_tags ON allocation_templates USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_template_roles_template ON template_roles(template_id);
CREATE INDEX IF NOT EXISTS idx_template_roles_skills ON template_roles USING GIN(required_skills);
CREATE INDEX IF NOT EXISTS idx_template_roles_order ON template_roles(template_id, display_order);

CREATE INDEX IF NOT EXISTS idx_template_milestones_template ON template_milestones(template_id);
CREATE INDEX IF NOT EXISTS idx_template_milestones_order ON template_milestones(template_id, display_order);
CREATE INDEX IF NOT EXISTS idx_template_milestones_timing ON template_milestones(week_offset, duration_weeks);

CREATE INDEX IF NOT EXISTS idx_customizations_template ON template_customizations(template_id);
CREATE INDEX IF NOT EXISTS idx_customizations_org ON template_customizations(organization_id);

CREATE INDEX IF NOT EXISTS idx_usage_template ON template_usage_history(template_id);
CREATE INDEX IF NOT EXISTS idx_usage_project ON template_usage_history(project_id);
CREATE INDEX IF NOT EXISTS idx_usage_rating ON template_usage_history(success_rating DESC);

-- 8. Create triggers for auto-updating timestamps
CREATE OR REPLACE FUNCTION update_allocation_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_allocation_templates_updated
    BEFORE UPDATE ON allocation_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_allocation_template_timestamp();

CREATE TRIGGER tr_template_customizations_updated
    BEFORE UPDATE ON template_customizations
    FOR EACH ROW
    EXECUTE FUNCTION update_allocation_template_timestamp();

-- 9. Create initial seed templates
INSERT INTO allocation_templates (
    name, description, category, tags, created_by, visibility, status,
    default_duration_weeks, default_priority
) VALUES 
(
    'Standard Web Application',
    'Full-stack web application with frontend, backend, and database components',
    'web_development',
    ARRAY['web', 'fullstack', 'react', 'nodejs'],
    (SELECT id FROM employees LIMIT 1), -- Use first employee as creator
    'public',
    'active',
    12,
    'medium'
),
(
    'Mobile App MVP',
    'Cross-platform mobile application minimum viable product',
    'mobile_app',
    ARRAY['mobile', 'react-native', 'mvp'],
    (SELECT id FROM employees LIMIT 1),
    'public',
    'active',
    16,
    'high'
),
(
    'Data Analytics Project',
    'End-to-end data analytics solution with visualization',
    'data_analytics',
    ARRAY['data', 'analytics', 'visualization', 'python'],
    (SELECT id FROM employees LIMIT 1),
    'public',
    'active',
    8,
    'medium'
),
(
    'DevOps Infrastructure',
    'Cloud infrastructure setup and CI/CD pipeline implementation',
    'devops',
    ARRAY['devops', 'aws', 'docker', 'kubernetes'],
    (SELECT id FROM employees LIMIT 1),
    'public',
    'active',
    6,
    'high'
);

-- Insert corresponding template roles for each template
WITH template_ids AS (
    SELECT id, name FROM allocation_templates WHERE status = 'active'
)
INSERT INTO template_roles (
    template_id, role_name, description, planned_allocation_percentage,
    estimated_hours_per_week, duration_weeks, minimum_experience_level,
    display_order, is_critical
)
SELECT 
    t.id,
    role_data.role_name,
    role_data.description,
    role_data.allocation,
    role_data.hours,
    role_data.duration,
    role_data.experience,
    role_data.order_pos,
    role_data.critical
FROM template_ids t
CROSS JOIN (
    -- Web Application roles
    SELECT 'Standard Web Application' as template_name, 'Frontend Developer' as role_name, 
           'React/Vue.js frontend development' as description,
           60.0 as allocation, 24.0 as hours, 10 as duration, 'mid'::experience_level as experience,
           1 as order_pos, true as critical
    UNION ALL
    SELECT 'Standard Web Application', 'Backend Developer',
           'Node.js/Python API development',
           80.0, 32.0, 12, 'mid'::experience_level, 2, true
    UNION ALL
    SELECT 'Standard Web Application', 'Database Administrator',
           'PostgreSQL/MongoDB database design',
           40.0, 16.0, 8, 'mid'::experience_level, 3, true
    UNION ALL
    SELECT 'Standard Web Application', 'DevOps Engineer',
           'Deployment and infrastructure setup',
           30.0, 12.0, 6, 'senior'::experience_level, 4, false
    UNION ALL
    
    -- Mobile App MVP roles
    SELECT 'Mobile App MVP', 'React Native Developer',
           'Cross-platform mobile app development',
           80.0, 32.0, 14, 'mid'::experience_level, 1, true
    UNION ALL
    SELECT 'Mobile App MVP', 'UI/UX Designer',
           'Mobile interface and experience design',
           50.0, 20.0, 12, 'mid'::experience_level, 2, true
    UNION ALL
    SELECT 'Mobile App MVP', 'Backend Developer',
           'API and backend services',
           60.0, 24.0, 16, 'mid'::experience_level, 3, true
    UNION ALL
    SELECT 'Mobile App MVP', 'QA Engineer',
           'Mobile testing and quality assurance',
           40.0, 16.0, 8, 'junior'::experience_level, 4, false
    UNION ALL
    
    -- Data Analytics roles
    SELECT 'Data Analytics Project', 'Data Scientist',
           'Data analysis and machine learning',
           80.0, 32.0, 8, 'senior'::experience_level, 1, true
    UNION ALL
    SELECT 'Data Analytics Project', 'Data Engineer',
           'Data pipeline and infrastructure',
           70.0, 28.0, 6, 'mid'::experience_level, 2, true
    UNION ALL
    SELECT 'Data Analytics Project', 'Frontend Developer',
           'Dashboard and visualization development',
           50.0, 20.0, 4, 'mid'::experience_level, 3, false
    UNION ALL
    
    -- DevOps Infrastructure roles
    SELECT 'DevOps Infrastructure', 'DevOps Engineer',
           'Infrastructure as code and automation',
           90.0, 36.0, 6, 'senior'::experience_level, 1, true
    UNION ALL
    SELECT 'DevOps Infrastructure', 'Cloud Architect',
           'Cloud architecture and security design',
           60.0, 24.0, 4, 'senior'::experience_level, 2, true
    UNION ALL
    SELECT 'DevOps Infrastructure', 'Security Engineer',
           'Security implementation and compliance',
           40.0, 16.0, 6, 'senior'::experience_level, 3, false
) role_data
WHERE t.name = role_data.template_name;

COMMIT;
-- Phase 4: Intelligent Features - Skill Taxonomy Enhancements
-- Migration 021: Enhanced Skill Taxonomy for AI-Powered Resource Planning
-- Description: Extends existing skill system with hierarchical taxonomy, competency frameworks, and skill relationships

-- Add skill hierarchy and taxonomy structure
ALTER TABLE skills ADD COLUMN IF NOT EXISTS parent_skill_id UUID REFERENCES skills(id);
ALTER TABLE skills ADD COLUMN IF NOT EXISTS skill_level INTEGER CHECK (skill_level >= 1 AND skill_level <= 5);
ALTER TABLE skills ADD COLUMN IF NOT EXISTS skill_weight DECIMAL(3,2) DEFAULT 1.0 CHECK (skill_weight >= 0.1 AND skill_weight <= 5.0);
ALTER TABLE skills ADD COLUMN IF NOT EXISTS market_demand DECIMAL(3,2) DEFAULT 1.0;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS rarity_score DECIMAL(3,2) DEFAULT 1.0;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS deprecation_risk DECIMAL(3,2) DEFAULT 0.0;

-- Skill taxonomy tree structure
CREATE TABLE IF NOT EXISTS skill_taxonomy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    level INTEGER NOT NULL CHECK (level >= 0 AND level <= 5), -- 0=root, 5=leaf
    parent_id UUID REFERENCES skill_taxonomy(id),
    path LTREE, -- PostgreSQL LTREE for hierarchical queries
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Map skills to taxonomy nodes
CREATE TABLE IF NOT EXISTS skill_taxonomy_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    taxonomy_id UUID NOT NULL REFERENCES skill_taxonomy(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) DEFAULT 'primary' CHECK (relationship_type IN ('primary', 'secondary', 'related')),
    weight DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(skill_id, taxonomy_id, relationship_type)
);

-- Skill prerequisites and dependencies
CREATE TABLE IF NOT EXISTS skill_prerequisites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    prerequisite_skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    requirement_type VARCHAR(50) DEFAULT 'required' CHECK (requirement_type IN ('required', 'recommended', 'nice_to_have')),
    minimum_proficiency INTEGER DEFAULT 3 CHECK (minimum_proficiency >= 1 AND minimum_proficiency <= 5),
    weight DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(skill_id, prerequisite_skill_id)
);

-- Skill complementarity and synergies
CREATE TABLE IF NOT EXISTS skill_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_a_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    skill_b_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL CHECK (relationship_type IN ('complementary', 'substitutable', 'conflicting', 'synergistic')),
    strength DECIMAL(3,2) DEFAULT 1.0 CHECK (strength >= 0.0 AND strength <= 3.0),
    confidence DECIMAL(3,2) DEFAULT 1.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
    evidence_count INTEGER DEFAULT 0,
    last_validated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (skill_a_id != skill_b_id),
    UNIQUE(skill_a_id, skill_b_id, relationship_type)
);

-- Enhanced project requirements with skill priorities and contexts
CREATE TABLE IF NOT EXISTS project_skill_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    required_proficiency INTEGER NOT NULL CHECK (required_proficiency >= 1 AND required_proficiency <= 5),
    minimum_years DECIMAL(3,1) DEFAULT 0,
    priority_level VARCHAR(20) DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'critical')),
    context_weight DECIMAL(3,2) DEFAULT 1.0,
    business_impact DECIMAL(3,2) DEFAULT 1.0,
    urgency_factor DECIMAL(3,2) DEFAULT 1.0,
    quantity_needed INTEGER DEFAULT 1,
    role_context VARCHAR(100),
    phase_requirements JSONB, -- Different requirements for different project phases
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, skill_id, role_context)
);

-- Competency frameworks and career paths
CREATE TABLE IF NOT EXISTS competency_frameworks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    framework_type VARCHAR(50) NOT NULL CHECK (framework_type IN ('role_based', 'level_based', 'functional', 'technical', 'leadership')),
    organization_level VARCHAR(50) DEFAULT 'company' CHECK (organization_level IN ('company', 'department', 'team', 'industry')),
    version VARCHAR(20) DEFAULT '1.0',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS competency_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    framework_id UUID NOT NULL REFERENCES competency_frameworks(id) ON DELETE CASCADE,
    level_name VARCHAR(50) NOT NULL,
    level_number INTEGER NOT NULL,
    description TEXT,
    expected_years DECIMAL(3,1),
    salary_range_min DECIMAL(12,2),
    salary_range_max DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(framework_id, level_number)
);

CREATE TABLE IF NOT EXISTS competency_skill_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    framework_id UUID NOT NULL REFERENCES competency_frameworks(id) ON DELETE CASCADE,
    level_id UUID NOT NULL REFERENCES competency_levels(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    required_proficiency INTEGER NOT NULL CHECK (required_proficiency >= 1 AND required_proficiency <= 5),
    weight DECIMAL(3,2) DEFAULT 1.0,
    is_core BOOLEAN DEFAULT false,
    assessment_method VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(level_id, skill_id)
);

-- Market intelligence for skills
CREATE TABLE IF NOT EXISTS skill_market_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    data_source VARCHAR(100) NOT NULL,
    data_date DATE NOT NULL,
    demand_score DECIMAL(5,2),
    supply_score DECIMAL(5,2),
    salary_premium DECIMAL(5,2), -- Percentage premium over baseline
    growth_trend DECIMAL(5,2), -- YoY growth percentage
    job_postings_count INTEGER,
    region VARCHAR(100),
    industry VARCHAR(100),
    confidence_score DECIMAL(3,2) DEFAULT 0.5,
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(skill_id, data_source, data_date, region, industry)
);

-- Enhanced indexes for performance
CREATE INDEX IF NOT EXISTS idx_skills_hierarchy ON skills(parent_skill_id) WHERE parent_skill_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_skills_weight ON skills(skill_weight);
CREATE INDEX IF NOT EXISTS idx_skills_demand ON skills(market_demand);
CREATE INDEX IF NOT EXISTS idx_skill_taxonomy_path ON skill_taxonomy USING GIST(path);
CREATE INDEX IF NOT EXISTS idx_skill_taxonomy_parent ON skill_taxonomy(parent_id);
CREATE INDEX IF NOT EXISTS idx_skill_prerequisites_skill ON skill_prerequisites(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_prerequisites_prereq ON skill_prerequisites(prerequisite_skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_relationships_skills ON skill_relationships(skill_a_id, skill_b_id);
CREATE INDEX IF NOT EXISTS idx_project_requirements_project ON project_skill_requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_project_requirements_skill ON project_skill_requirements(skill_id);
CREATE INDEX IF NOT EXISTS idx_project_requirements_priority ON project_skill_requirements(priority_level);
CREATE INDEX IF NOT EXISTS idx_competency_mappings_framework ON competency_skill_mappings(framework_id);
CREATE INDEX IF NOT EXISTS idx_skill_market_data_skill ON skill_market_data(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_market_data_date ON skill_market_data(data_date);

-- Create or update trigger functions
CREATE OR REPLACE FUNCTION update_skill_taxonomy_path() 
RETURNS TRIGGER AS $$
DECLARE
    parent_path LTREE;
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.path = NEW.id::text::LTREE;
    ELSE
        SELECT path INTO parent_path FROM skill_taxonomy WHERE id = NEW.parent_id;
        NEW.path = parent_path || NEW.id::text::LTREE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER skill_taxonomy_path_trigger
    BEFORE INSERT OR UPDATE ON skill_taxonomy
    FOR EACH ROW EXECUTE FUNCTION update_skill_taxonomy_path();

CREATE TRIGGER update_project_skill_requirements_updated_at 
    BEFORE UPDATE ON project_skill_requirements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competency_frameworks_updated_at 
    BEFORE UPDATE ON competency_frameworks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for skill taxonomy
INSERT INTO skill_taxonomy (name, description, level, parent_id) VALUES
('Technology', 'All technology-related skills', 0, NULL),
('Programming', 'Programming and development skills', 1, (SELECT id FROM skill_taxonomy WHERE name = 'Technology')),
('Web Development', 'Web development technologies', 2, (SELECT id FROM skill_taxonomy WHERE name = 'Programming')),
('Frontend', 'Frontend development skills', 3, (SELECT id FROM skill_taxonomy WHERE name = 'Web Development')),
('Backend', 'Backend development skills', 3, (SELECT id FROM skill_taxonomy WHERE name = 'Web Development')),
('Data Science', 'Data science and analytics', 1, (SELECT id FROM skill_taxonomy WHERE name = 'Technology')),
('Machine Learning', 'ML and AI technologies', 2, (SELECT id FROM skill_taxonomy WHERE name = 'Data Science')),
('Business', 'Business and management skills', 0, NULL),
('Project Management', 'Project management methodologies', 1, (SELECT id FROM skill_taxonomy WHERE name = 'Business')),
('Leadership', 'Leadership and team management', 1, (SELECT id FROM skill_taxonomy WHERE name = 'Business'))
ON CONFLICT (name) DO NOTHING;

-- Sample competency framework
INSERT INTO competency_frameworks (name, description, framework_type) VALUES
('Software Engineering Career Path', 'Technical career progression for software engineers', 'role_based'),
('Leadership Competency Model', 'Leadership skills progression framework', 'leadership'),
('Data Science Specialization', 'Data science role specialization paths', 'technical')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE skills IS 'Enhanced skills table with hierarchy and market intelligence';
COMMENT ON TABLE skill_taxonomy IS 'Hierarchical taxonomy structure for skill categorization';
COMMENT ON TABLE skill_prerequisites IS 'Skill dependencies and prerequisites';
COMMENT ON TABLE skill_relationships IS 'Relationships between skills (complementary, substitutable, etc.)';
COMMENT ON TABLE project_skill_requirements IS 'Enhanced project skill requirements with priorities and context';
COMMENT ON TABLE competency_frameworks IS 'Career progression and competency frameworks';
COMMENT ON TABLE skill_market_data IS 'External market data for skill demand and supply';
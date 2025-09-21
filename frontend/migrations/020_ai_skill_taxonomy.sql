-- Migration: 020_ai_skill_taxonomy.sql
-- Description: Create AI-enhanced skill taxonomy and management system
-- Author: Backend API Developer Agent
-- Date: 2025-09-07
-- Prerequisites: 001_initial_schema.sql (employees, skills, employee_skills tables)

BEGIN;

-- Create skill categories table for hierarchical taxonomy
CREATE TABLE skill_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  parent_id UUID REFERENCES skill_categories(id),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- AI enhancement fields
  ai_importance_score DECIMAL(3,2) DEFAULT 0.0 CHECK (ai_importance_score BETWEEN 0.0 AND 1.0),
  market_demand_trend VARCHAR(20) DEFAULT 'stable' CHECK (market_demand_trend IN ('declining', 'stable', 'growing', 'emerging')),
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  
  -- Constraints
  CONSTRAINT skill_categories_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT skill_categories_no_self_reference CHECK (id != parent_id)
);

-- Extend existing skills table with AI enhancements
ALTER TABLE skills ADD COLUMN IF NOT EXISTS skill_category_id UUID REFERENCES skill_categories(id);
ALTER TABLE skills ADD COLUMN IF NOT EXISTS ai_complexity_score DECIMAL(3,2) DEFAULT 0.5 CHECK (ai_complexity_score BETWEEN 0.0 AND 1.0);
ALTER TABLE skills ADD COLUMN IF NOT EXISTS learning_curve_weeks INTEGER DEFAULT 4 CHECK (learning_curve_weeks >= 0);
ALTER TABLE skills ADD COLUMN IF NOT EXISTS obsolescence_risk VARCHAR(20) DEFAULT 'low' CHECK (obsolescence_risk IN ('low', 'medium', 'high'));
ALTER TABLE skills ADD COLUMN IF NOT EXISTS industry_relevance JSONB DEFAULT '[]'; -- Array of industry tags
ALTER TABLE skills ADD COLUMN IF NOT EXISTS related_skills JSONB DEFAULT '[]'; -- Array of skill IDs
ALTER TABLE skills ADD COLUMN IF NOT EXISTS certification_available BOOLEAN DEFAULT false;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS remote_work_applicable BOOLEAN DEFAULT true;

-- Enhanced employee_skills with AI proficiency tracking
-- Drop and recreate with new columns since we can't easily ALTER with complex constraints
ALTER TABLE employee_skills DROP CONSTRAINT IF EXISTS employee_skills_proficiency_valid;
ALTER TABLE employee_skills ADD COLUMN IF NOT EXISTS proficiency_numeric DECIMAL(3,2) DEFAULT 0.0 CHECK (proficiency_numeric BETWEEN 0.0 AND 5.0);
ALTER TABLE employee_skills ADD COLUMN IF NOT EXISTS confidence_level DECIMAL(3,2) DEFAULT 0.8 CHECK (confidence_level BETWEEN 0.0 AND 1.0);
ALTER TABLE employee_skills ADD COLUMN IF NOT EXISTS skill_source VARCHAR(50) DEFAULT 'self_reported' CHECK (skill_source IN ('self_reported', 'manager_assessed', 'peer_reviewed', 'ai_inferred', 'certification', 'project_based'));
ALTER TABLE employee_skills ADD COLUMN IF NOT EXISTS last_validation_date TIMESTAMPTZ;
ALTER TABLE employee_skills ADD COLUMN IF NOT EXISTS validation_method VARCHAR(50);
ALTER TABLE employee_skills ADD COLUMN IF NOT EXISTS skill_growth_rate DECIMAL(4,2) DEFAULT 0.0; -- Skills per month
ALTER TABLE employee_skills ADD COLUMN IF NOT EXISTS project_usage_count INTEGER DEFAULT 0;
ALTER TABLE employee_skills ADD COLUMN IF NOT EXISTS peer_endorsements INTEGER DEFAULT 0;

-- Add back proficiency constraint with updated values
ALTER TABLE employee_skills ADD CONSTRAINT employee_skills_proficiency_valid 
  CHECK (proficiency_level IN ('Beginner', 'Intermediate', 'Advanced', 'Expert', 'Master'));

-- Update proficiency_numeric based on proficiency_level for existing data
UPDATE employee_skills SET proficiency_numeric = 
  CASE proficiency_level
    WHEN 'Beginner' THEN 1.0
    WHEN 'Intermediate' THEN 2.5
    WHEN 'Advanced' THEN 4.0
    WHEN 'Expert' THEN 4.8
    WHEN 'Master' THEN 5.0
    ELSE 0.0
  END
WHERE proficiency_numeric = 0.0;

-- Project skill requirements table for AI matching
CREATE TABLE project_skill_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL, -- Will reference projects table when created
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  required_level VARCHAR(20) NOT NULL DEFAULT 'Intermediate' CHECK (required_level IN ('Beginner', 'Intermediate', 'Advanced', 'Expert', 'Master')),
  required_level_numeric DECIMAL(3,2) NOT NULL DEFAULT 2.5 CHECK (required_level_numeric BETWEEN 0.0 AND 5.0),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  priority_numeric DECIMAL(3,2) DEFAULT 0.5 CHECK (priority_numeric BETWEEN 0.0 AND 1.0),
  
  -- AI matching parameters
  weight DECIMAL(3,2) DEFAULT 0.5 CHECK (weight BETWEEN 0.0 AND 1.0),
  is_mandatory BOOLEAN DEFAULT false,
  substitutable_skills JSONB DEFAULT '[]', -- Array of skill IDs that can substitute
  experience_months_required INTEGER DEFAULT 0,
  
  -- Resource planning
  estimated_hours DECIMAL(8,2) DEFAULT 0,
  actual_hours DECIMAL(8,2) DEFAULT 0,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  
  -- Constraints
  UNIQUE(project_id, skill_id)
);

-- Skill relationships table for AI recommendations
CREATE TABLE skill_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  primary_skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  related_skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  relationship_type VARCHAR(30) NOT NULL CHECK (relationship_type IN ('prerequisite', 'complement', 'alternative', 'progression', 'synergy')),
  strength DECIMAL(3,2) DEFAULT 0.5 CHECK (strength BETWEEN 0.0 AND 1.0),
  
  -- AI learning paths
  learning_order INTEGER DEFAULT 0,
  recommended_gap_weeks INTEGER DEFAULT 0,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  
  -- Constraints
  UNIQUE(primary_skill_id, related_skill_id),
  CONSTRAINT skill_relationships_no_self_reference CHECK (primary_skill_id != related_skill_id)
);

-- Skill gap analysis table for AI-driven development planning
CREATE TABLE skill_gap_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  current_level_numeric DECIMAL(3,2) NOT NULL DEFAULT 0.0 CHECK (current_level_numeric BETWEEN 0.0 AND 5.0),
  target_level_numeric DECIMAL(3,2) NOT NULL DEFAULT 0.0 CHECK (target_level_numeric BETWEEN 0.0 AND 5.0),
  
  -- AI predictions
  estimated_learning_weeks INTEGER NOT NULL DEFAULT 0,
  confidence_score DECIMAL(3,2) DEFAULT 0.7 CHECK (confidence_score BETWEEN 0.0 AND 1.0),
  priority_score DECIMAL(3,2) DEFAULT 0.5 CHECK (priority_score BETWEEN 0.0 AND 1.0),
  
  -- Planning
  target_completion_date DATE,
  learning_path JSONB DEFAULT '[]', -- Array of learning steps
  recommended_resources JSONB DEFAULT '[]', -- Array of resource suggestions
  
  -- Progress tracking
  status VARCHAR(20) DEFAULT 'identified' CHECK (status IN ('identified', 'planned', 'in_progress', 'completed', 'deferred')),
  progress_percentage DECIMAL(5,2) DEFAULT 0.0 CHECK (progress_percentage BETWEEN 0.0 AND 100.0),
  last_assessment_date TIMESTAMPTZ,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  
  -- Constraints
  UNIQUE(employee_id, skill_id),
  CONSTRAINT skill_gap_target_higher CHECK (target_level_numeric > current_level_numeric)
);

-- Create comprehensive indexes for AI performance
CREATE INDEX idx_skill_categories_parent ON skill_categories(parent_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_skill_categories_level ON skill_categories(level) WHERE deleted_at IS NULL;
CREATE INDEX idx_skill_categories_active ON skill_categories(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_skill_categories_ai_importance ON skill_categories(ai_importance_score DESC) WHERE deleted_at IS NULL;

CREATE INDEX idx_skills_category ON skills(skill_category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_skills_ai_complexity ON skills(ai_complexity_score) WHERE deleted_at IS NULL;
CREATE INDEX idx_skills_obsolescence_risk ON skills(obsolescence_risk) WHERE deleted_at IS NULL;
CREATE INDEX idx_skills_industry_relevance ON skills USING GIN(industry_relevance) WHERE deleted_at IS NULL;

CREATE INDEX idx_employee_skills_proficiency_numeric ON employee_skills(proficiency_numeric DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_employee_skills_confidence ON employee_skills(confidence_level DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_employee_skills_source ON employee_skills(skill_source) WHERE deleted_at IS NULL;
CREATE INDEX idx_employee_skills_last_validation ON employee_skills(last_validation_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_employee_skills_growth_rate ON employee_skills(skill_growth_rate DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_employee_skills_composite ON employee_skills(employee_id, skill_id, proficiency_numeric DESC) WHERE deleted_at IS NULL;

CREATE INDEX idx_project_skill_requirements_project ON project_skill_requirements(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_skill_requirements_skill ON project_skill_requirements(skill_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_skill_requirements_priority ON project_skill_requirements(priority_numeric DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_skill_requirements_mandatory ON project_skill_requirements(is_mandatory) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_skill_requirements_composite ON project_skill_requirements(project_id, skill_id, priority_numeric DESC) WHERE deleted_at IS NULL;

CREATE INDEX idx_skill_relationships_primary ON skill_relationships(primary_skill_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_skill_relationships_related ON skill_relationships(related_skill_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_skill_relationships_type ON skill_relationships(relationship_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_skill_relationships_strength ON skill_relationships(strength DESC) WHERE deleted_at IS NULL;

CREATE INDEX idx_skill_gap_analysis_employee ON skill_gap_analysis(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_skill_gap_analysis_skill ON skill_gap_analysis(skill_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_skill_gap_analysis_priority ON skill_gap_analysis(priority_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_skill_gap_analysis_status ON skill_gap_analysis(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_skill_gap_analysis_completion ON skill_gap_analysis(target_completion_date) WHERE deleted_at IS NULL;

-- Create triggers for updated_at columns
CREATE TRIGGER trigger_skill_categories_updated_at
  BEFORE UPDATE ON skill_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_project_skill_requirements_updated_at
  BEFORE UPDATE ON project_skill_requirements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_skill_relationships_updated_at
  BEFORE UPDATE ON skill_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_skill_gap_analysis_updated_at
  BEFORE UPDATE ON skill_gap_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update priority_numeric based on priority text
CREATE OR REPLACE FUNCTION update_priority_numeric()
RETURNS TRIGGER AS $$
BEGIN
  NEW.priority_numeric = CASE NEW.priority
    WHEN 'low' THEN 0.25
    WHEN 'medium' THEN 0.5
    WHEN 'high' THEN 0.75
    WHEN 'critical' THEN 1.0
    ELSE 0.5
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update priority_numeric
CREATE TRIGGER trigger_project_skill_requirements_priority_numeric
  BEFORE INSERT OR UPDATE ON project_skill_requirements
  FOR EACH ROW
  EXECUTE FUNCTION update_priority_numeric();

-- Function to automatically update required_level_numeric based on required_level text
CREATE OR REPLACE FUNCTION update_required_level_numeric()
RETURNS TRIGGER AS $$
BEGIN
  NEW.required_level_numeric = CASE NEW.required_level
    WHEN 'Beginner' THEN 1.0
    WHEN 'Intermediate' THEN 2.5
    WHEN 'Advanced' THEN 4.0
    WHEN 'Expert' THEN 4.8
    WHEN 'Master' THEN 5.0
    ELSE 2.5
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update required_level_numeric
CREATE TRIGGER trigger_project_skill_requirements_level_numeric
  BEFORE INSERT OR UPDATE ON project_skill_requirements
  FOR EACH ROW
  EXECUTE FUNCTION update_required_level_numeric();

-- Insert default skill categories for AI taxonomy
INSERT INTO skill_categories (name, description, level, sort_order, ai_importance_score, market_demand_trend) VALUES
('Technical Skills', 'Core technical and programming competencies', 1, 1, 0.9, 'growing'),
('Soft Skills', 'Communication, leadership, and interpersonal abilities', 1, 2, 0.8, 'stable'),
('Domain Knowledge', 'Industry-specific knowledge and expertise', 1, 3, 0.7, 'stable'),
('Tools & Platforms', 'Software tools, platforms, and technologies', 1, 4, 0.8, 'growing'),
('Methodologies', 'Work processes, frameworks, and methodologies', 1, 5, 0.6, 'stable');

-- Insert subcategories for Technical Skills
INSERT INTO skill_categories (name, description, parent_id, level, sort_order, ai_importance_score, market_demand_trend)
SELECT 
  subcategory,
  subcategory || ' development and expertise',
  sc.id,
  2,
  ROW_NUMBER() OVER (),
  importance,
  trend
FROM skill_categories sc,
  (VALUES 
    ('Programming Languages', 0.95, 'growing'),
    ('Web Technologies', 0.9, 'growing'),
    ('Database Systems', 0.8, 'stable'),
    ('Cloud Platforms', 0.9, 'growing'),
    ('DevOps & Infrastructure', 0.85, 'growing'),
    ('Data Science & Analytics', 0.9, 'growing'),
    ('Mobile Development', 0.8, 'stable'),
    ('AI & Machine Learning', 0.95, 'emerging')
  ) AS t(subcategory, importance, trend)
WHERE sc.name = 'Technical Skills';

COMMIT;
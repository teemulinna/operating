-- Migration: 004_create_employee_skills
-- Description: Create employee_skills junction table with proficiency levels

-- Create proficiency_level enum
CREATE TYPE proficiency_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert', 'master');

-- Create employee_skills table
CREATE TABLE employee_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL,
    skill_id UUID NOT NULL,
    proficiency_level proficiency_level NOT NULL,
    years_of_experience INTEGER NOT NULL CHECK (years_of_experience >= 0),
    last_assessed DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_employee_skills_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    CONSTRAINT fk_employee_skills_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate employee-skill mappings
    CONSTRAINT uk_employee_skills_employee_skill UNIQUE (employee_id, skill_id)
);

-- Create indexes
CREATE INDEX idx_employee_skills_employee_id ON employee_skills(employee_id);
CREATE INDEX idx_employee_skills_skill_id ON employee_skills(skill_id);
CREATE INDEX idx_employee_skills_proficiency ON employee_skills(proficiency_level);
CREATE INDEX idx_employee_skills_experience ON employee_skills(years_of_experience);
CREATE INDEX idx_employee_skills_is_active ON employee_skills(is_active);
CREATE INDEX idx_employee_skills_employee_active ON employee_skills(employee_id, is_active);
CREATE INDEX idx_employee_skills_skill_proficiency ON employee_skills(skill_id, proficiency_level);

-- Proficiency level is already constrained by the enum type
-- No additional constraint needed as enum values are enforced by PostgreSQL

-- Create trigger for updated_at
CREATE TRIGGER update_employee_skills_updated_at 
    BEFORE UPDATE ON employee_skills 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
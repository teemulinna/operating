-- Migration: 002_create_skills
-- Description: Create skills table with categories

-- Create skill_category enum
CREATE TYPE skill_category AS ENUM ('technical', 'soft', 'language', 'certification', 'domain');

-- Create skills table
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category skill_category NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_skills_name ON skills(name);
CREATE INDEX idx_skills_category ON skills(category);
CREATE INDEX idx_skills_is_active ON skills(is_active);
CREATE INDEX idx_skills_category_active ON skills(category, is_active);

-- Create trigger for updated_at
CREATE TRIGGER update_skills_updated_at 
    BEFORE UPDATE ON skills 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Phase 2: Enhanced Skills Management System
-- Migration 015: Skills Management Tables

-- Enhanced skills table with categories and metadata
CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('Technical', 'Soft', 'Domain', 'Certifications', 'Language')),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employee skills with proficiency tracking
CREATE TABLE IF NOT EXISTS employee_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency_level INTEGER CHECK (proficiency_level >= 1 AND proficiency_level <= 5),
    certification_level VARCHAR(50),
    years_of_experience DECIMAL(3,1),
    last_used DATE,
    validated_by UUID REFERENCES employees(id),
    validation_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, skill_id)
);

-- Skill assessments and validations
CREATE TABLE IF NOT EXISTS skill_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    skill_id UUID NOT NULL REFERENCES skills(id),
    assessor_id UUID REFERENCES employees(id),
    assessment_type VARCHAR(50) NOT NULL CHECK (assessment_type IN ('self', 'peer', 'manager', 'external')),
    score INTEGER CHECK (score >= 1 AND score <= 5),
    feedback TEXT,
    assessment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_valid BOOLEAN DEFAULT true
);

-- Training recommendations
CREATE TABLE IF NOT EXISTS training_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    skill_id UUID NOT NULL REFERENCES skills(id),
    recommendation_type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    reason TEXT NOT NULL,
    suggested_resources JSONB,
    estimated_duration_hours INTEGER,
    estimated_cost DECIMAL(10,2),
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_progress', 'completed', 'declined')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Skill gap analysis results
CREATE TABLE IF NOT EXISTS skill_gap_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    department_id UUID REFERENCES departments(id),
    project_id INTEGER REFERENCES projects(id),
    analysis_type VARCHAR(50) NOT NULL CHECK (analysis_type IN ('individual', 'department', 'project', 'organization')),
    analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    results JSONB NOT NULL, -- Contains gap analysis results
    recommendations JSONB,
    created_by UUID REFERENCES employees(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_skills_employee_id ON employee_skills(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_skill_id ON employee_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_proficiency ON employee_skills(proficiency_level);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_active ON skills(is_active);
CREATE INDEX IF NOT EXISTS idx_skill_assessments_employee ON skill_assessments(employee_id);
CREATE INDEX IF NOT EXISTS idx_skill_assessments_date ON skill_assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_training_recommendations_employee ON training_recommendations(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_recommendations_priority ON training_recommendations(priority);

-- Insert default skill categories and common skills
INSERT INTO skills (name, category, description) VALUES
-- Technical Skills
('JavaScript', 'Technical', 'JavaScript programming language'),
('TypeScript', 'Technical', 'TypeScript programming language'),
('React', 'Technical', 'React.js frontend framework'),
('Node.js', 'Technical', 'Node.js runtime environment'),
('Python', 'Technical', 'Python programming language'),
('Java', 'Technical', 'Java programming language'),
('SQL', 'Technical', 'Structured Query Language for databases'),
('PostgreSQL', 'Technical', 'PostgreSQL database system'),
('MongoDB', 'Technical', 'MongoDB NoSQL database'),
('AWS', 'Technical', 'Amazon Web Services cloud platform'),
('Docker', 'Technical', 'Container platform'),
('Kubernetes', 'Technical', 'Container orchestration platform'),

-- Soft Skills
('Leadership', 'Soft', 'Team leadership and management abilities'),
('Communication', 'Soft', 'Effective verbal and written communication'),
('Problem Solving', 'Soft', 'Analytical and creative problem-solving skills'),
('Project Management', 'Soft', 'Planning and managing projects effectively'),
('Team Collaboration', 'Soft', 'Working effectively in team environments'),
('Mentoring', 'Soft', 'Teaching and guiding junior team members'),
('Conflict Resolution', 'Soft', 'Resolving disputes and conflicts constructively'),

-- Domain Skills
('Financial Analysis', 'Domain', 'Understanding financial metrics and analysis'),
('Healthcare', 'Domain', 'Knowledge of healthcare industry practices'),
('E-commerce', 'Domain', 'Understanding of online retail and commerce'),
('Banking', 'Domain', 'Knowledge of banking and financial services'),
('Education', 'Domain', 'Understanding of educational systems and practices'),

-- Certifications
('PMP', 'Certifications', 'Project Management Professional certification'),
('AWS Certified Solutions Architect', 'Certifications', 'AWS cloud architecture certification'),
('Scrum Master', 'Certifications', 'Certified Scrum Master credential'),
('CISSP', 'Certifications', 'Certified Information Systems Security Professional')

ON CONFLICT (name) DO NOTHING;

-- Create trigger for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_skills_updated_at BEFORE UPDATE ON employee_skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_recommendations_updated_at BEFORE UPDATE ON training_recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Phase 2: Role Templates System
-- Migration 016: Role Templates and Resource Planning

-- Role templates for standardized positions
CREATE TABLE IF NOT EXISTS role_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    department VARCHAR(50),
    level VARCHAR(20) CHECK (level IN ('Entry', 'Junior', 'Mid', 'Senior', 'Lead', 'Principal', 'Executive')),
    standard_hourly_rate DECIMAL(8,2),
    estimated_salary_min DECIMAL(10,2),
    estimated_salary_max DECIMAL(10,2),
    responsibilities JSONB, -- Array of responsibility descriptions
    requirements JSONB, -- Array of requirements
    preferred_qualifications JSONB, -- Array of preferred qualifications
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES employees(id)
);

-- Skills required for role templates
CREATE TABLE IF NOT EXISTS role_template_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES role_templates(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    min_proficiency INTEGER CHECK (min_proficiency >= 1 AND min_proficiency <= 5),
    is_required BOOLEAN DEFAULT true,
    weight DECIMAL(3,2) DEFAULT 1.0, -- Weight for skill matching algorithms
    UNIQUE(template_id, skill_id)
);

-- Template assignments to projects (placeholder resources)
CREATE TABLE IF NOT EXISTS project_template_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES role_templates(id),
    quantity INTEGER DEFAULT 1,
    start_date DATE,
    end_date DATE,
    allocation_percentage INTEGER DEFAULT 100 CHECK (allocation_percentage >= 1 AND allocation_percentage <= 100),
    custom_hourly_rate DECIMAL(8,2),
    is_placeholder BOOLEAN DEFAULT true,
    status VARCHAR(30) DEFAULT 'planned' CHECK (status IN ('planned', 'recruiting', 'filled', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Template usage analytics
CREATE TABLE IF NOT EXISTS template_usage_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES role_templates(id),
    usage_date DATE DEFAULT CURRENT_DATE,
    project_id INTEGER REFERENCES projects(id),
    usage_type VARCHAR(30) CHECK (usage_type IN ('applied', 'cloned', 'referenced')),
    success_score INTEGER CHECK (success_score >= 1 AND success_score <= 5), -- How well template worked
    feedback TEXT
);

-- Employee-template matching scores (for optimization)
CREATE TABLE IF NOT EXISTS employee_template_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    template_id UUID NOT NULL REFERENCES role_templates(id),
    match_score DECIMAL(5,2) CHECK (match_score >= 0 AND match_score <= 100),
    skill_matches JSONB, -- Detailed skill matching results
    gaps JSONB, -- Skills gaps identified
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, template_id)
);

-- Template categories for organization
CREATE TABLE IF NOT EXISTS template_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES template_categories(id),
    display_order INTEGER DEFAULT 0
);

-- Template-category relationships
CREATE TABLE IF NOT EXISTS role_template_categories (
    template_id UUID REFERENCES role_templates(id) ON DELETE CASCADE,
    category_id UUID REFERENCES template_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (template_id, category_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_role_templates_department ON role_templates(department);
CREATE INDEX IF NOT EXISTS idx_role_templates_level ON role_templates(level);
CREATE INDEX IF NOT EXISTS idx_role_templates_active ON role_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_role_template_skills_template ON role_template_skills(template_id);
CREATE INDEX IF NOT EXISTS idx_project_template_assignments_project ON project_template_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_template_assignments_template ON project_template_assignments(template_id);
CREATE INDEX IF NOT EXISTS idx_project_template_assignments_status ON project_template_assignments(status);
CREATE INDEX IF NOT EXISTS idx_employee_template_matches_employee ON employee_template_matches(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_template_matches_score ON employee_template_matches(match_score DESC);

-- Insert default template categories
INSERT INTO template_categories (name, description, display_order) VALUES
('Engineering', 'Software engineering and technical roles', 1),
('Product', 'Product management and strategy roles', 2),
('Design', 'UI/UX and design roles', 3),
('Data', 'Data science and analytics roles', 4),
('Operations', 'DevOps and infrastructure roles', 5),
('Management', 'Leadership and management roles', 6),
('Sales', 'Sales and business development roles', 7),
('Marketing', 'Marketing and communications roles', 8),
('Support', 'Customer support and success roles', 9),
('HR', 'Human resources and talent roles', 10)
ON CONFLICT (name) DO NOTHING;

-- Insert common role templates
INSERT INTO role_templates (name, description, department, level, standard_hourly_rate, estimated_salary_min, estimated_salary_max, responsibilities, requirements) VALUES

('Junior Frontend Developer', 'Entry-level frontend developer for web applications', 'Engineering', 'Junior', 45, 50000, 65000, 
 '["Develop user interface components", "Implement responsive designs", "Write clean, maintainable code", "Participate in code reviews"]',
 '["1-2 years experience with HTML, CSS, JavaScript", "Familiarity with React or similar framework", "Understanding of responsive design", "Basic Git knowledge"]'),

('Senior Full Stack Developer', 'Experienced developer for complex web applications', 'Engineering', 'Senior', 85, 90000, 130000,
 '["Lead development of complex features", "Mentor junior developers", "Review code and architecture decisions", "Design system components"]',
 '["5+ years full-stack development experience", "Expert in JavaScript/TypeScript", "Experience with React and Node.js", "Database design experience", "Leadership skills"]'),

('Product Manager', 'Drive product strategy and feature development', 'Product', 'Mid', 75, 80000, 120000,
 '["Define product roadmaps", "Collaborate with engineering teams", "Analyze user feedback and metrics", "Manage stakeholder communications"]',
 '["3+ years product management experience", "Strong analytical skills", "Experience with agile methodologies", "Excellent communication skills"]'),

('UX Designer', 'Create intuitive user experiences and interfaces', 'Design', 'Mid', 65, 70000, 95000,
 '["Design user interfaces and experiences", "Create wireframes and prototypes", "Conduct user research", "Collaborate with development teams"]',
 '["3+ years UX design experience", "Proficiency in design tools (Figma, Sketch)", "Understanding of user research methods", "Portfolio of design work"]'),

('DevOps Engineer', 'Maintain and scale infrastructure and deployment pipelines', 'Operations', 'Mid', 80, 85000, 115000,
 '["Manage CI/CD pipelines", "Monitor system performance", "Automate deployment processes", "Ensure security and compliance"]',
 '["3+ years DevOps experience", "Experience with AWS/Azure/GCP", "Docker and Kubernetes knowledge", "Infrastructure as code experience"]'),

('Data Scientist', 'Extract insights from data and build predictive models', 'Data', 'Mid', 90, 95000, 130000,
 '["Analyze large datasets", "Build machine learning models", "Create data visualizations", "Collaborate with stakeholders"]',
 '["Advanced degree in relevant field", "Python/R programming skills", "Machine learning expertise", "Statistical analysis experience"]'),

('Engineering Manager', 'Lead and manage engineering teams', 'Engineering', 'Lead', 100, 120000, 160000,
 '["Manage engineering team performance", "Define technical strategy", "Coordinate cross-team projects", "Hire and develop talent"]',
 '["5+ years engineering experience", "2+ years management experience", "Strong technical background", "Leadership and communication skills"]')

ON CONFLICT (name) DO NOTHING;

-- Create triggers for updated_at
CREATE TRIGGER update_role_templates_updated_at BEFORE UPDATE ON role_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_template_assignments_updated_at BEFORE UPDATE ON project_template_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
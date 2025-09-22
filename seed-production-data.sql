-- Seed Production-Quality Test Data
-- This creates a realistic resource planning scenario

-- Insert departments if not exists
INSERT INTO departments (id, name) VALUES
  (1, 'Engineering'),
  (2, 'Design'),
  (3, 'Product'),
  (4, 'Marketing')
ON CONFLICT (id) DO NOTHING;

-- Insert realistic employees
INSERT INTO employees (first_name, last_name, email, position, department_id, default_hours, salary, hire_date, is_active) VALUES
  ('John', 'Doe', 'john.doe@company.com', 'Senior Developer', 1, 40, 120000, '2021-01-15', true),
  ('Jane', 'Smith', 'jane.smith@company.com', 'UX Designer', 2, 40, 95000, '2021-03-20', true),
  ('Mike', 'Johnson', 'mike.johnson@company.com', 'Product Manager', 3, 40, 130000, '2020-11-10', true),
  ('Sarah', 'Williams', 'sarah.williams@company.com', 'Frontend Developer', 1, 40, 105000, '2022-02-01', true),
  ('David', 'Brown', 'david.brown@company.com', 'Backend Developer', 1, 40, 115000, '2021-06-15', true),
  ('Emily', 'Davis', 'emily.davis@company.com', 'UI Designer', 2, 40, 90000, '2022-08-01', true),
  ('Robert', 'Miller', 'robert.miller@company.com', 'DevOps Engineer', 1, 40, 125000, '2020-09-01', true),
  ('Lisa', 'Wilson', 'lisa.wilson@company.com', 'Marketing Manager', 4, 40, 100000, '2021-04-15', true),
  ('Tom', 'Anderson', 'tom.anderson@company.com', 'QA Engineer', 1, 40, 85000, '2022-10-01', true),
  ('Amy', 'Taylor', 'amy.taylor@company.com', 'Scrum Master', 3, 40, 95000, '2021-07-20', true)
ON CONFLICT (email) DO NOTHING;

-- Insert active projects
INSERT INTO projects (name, description, client_name, status, start_date, end_date, budget, priority, estimated_hours) VALUES
  ('E-Commerce Platform', 'Complete redesign of main e-commerce platform', 'TechCorp', 'active', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '60 days', 250000, 'high', 1200),
  ('Mobile App v2.0', 'Major update to iOS and Android apps', 'Internal', 'active', CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE + INTERVAL '90 days', 180000, 'high', 960),
  ('Marketing Website', 'New marketing website with CMS', 'StartupXYZ', 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '45 days', 75000, 'medium', 480),
  ('API Integration', 'Third-party API integration project', 'FinanceInc', 'planning', CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '60 days', 95000, 'medium', 640),
  ('Data Analytics Dashboard', 'Real-time analytics dashboard', 'DataCo', 'active', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE + INTERVAL '30 days', 120000, 'high', 720),
  ('Security Audit', 'Comprehensive security review and fixes', 'Internal', 'active', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '21 days', 45000, 'critical', 320)
ON CONFLICT DO NOTHING;

-- Create realistic allocations (current week)
DO $$
DECLARE
  emp_record RECORD;
  proj_record RECORD;
  allocation_date DATE := CURRENT_DATE;
BEGIN
  -- Allocate John Doe to E-Commerce Platform
  INSERT INTO allocations (employee_id, project_id, hours, date, status)
  SELECT
    (SELECT id FROM employees WHERE email = 'john.doe@company.com'),
    (SELECT id FROM projects WHERE name = 'E-Commerce Platform'),
    8,
    allocation_date,
    'active'
  WHERE EXISTS (SELECT 1 FROM employees WHERE email = 'john.doe@company.com')
    AND EXISTS (SELECT 1 FROM projects WHERE name = 'E-Commerce Platform');

  -- Allocate Sarah Williams to Mobile App
  INSERT INTO allocations (employee_id, project_id, hours, date, status)
  SELECT
    (SELECT id FROM employees WHERE email = 'sarah.williams@company.com'),
    (SELECT id FROM projects WHERE name = 'Mobile App v2.0'),
    8,
    allocation_date,
    'active'
  WHERE EXISTS (SELECT 1 FROM employees WHERE email = 'sarah.williams@company.com')
    AND EXISTS (SELECT 1 FROM projects WHERE name = 'Mobile App v2.0');

  -- Allocate Jane Smith to Marketing Website
  INSERT INTO allocations (employee_id, project_id, hours, date, status)
  SELECT
    (SELECT id FROM employees WHERE email = 'jane.smith@company.com'),
    (SELECT id FROM projects WHERE name = 'Marketing Website'),
    6,
    allocation_date,
    'active'
  WHERE EXISTS (SELECT 1 FROM employees WHERE email = 'jane.smith@company.com')
    AND EXISTS (SELECT 1 FROM projects WHERE name = 'Marketing Website');

  -- Allocate David Brown to Data Analytics Dashboard
  INSERT INTO allocations (employee_id, project_id, hours, date, status)
  SELECT
    (SELECT id FROM employees WHERE email = 'david.brown@company.com'),
    (SELECT id FROM projects WHERE name = 'Data Analytics Dashboard'),
    8,
    allocation_date,
    'active'
  WHERE EXISTS (SELECT 1 FROM employees WHERE email = 'david.brown@company.com')
    AND EXISTS (SELECT 1 FROM projects WHERE name = 'Data Analytics Dashboard');

  -- Allocate Robert Miller to Security Audit
  INSERT INTO allocations (employee_id, project_id, hours, date, status)
  SELECT
    (SELECT id FROM employees WHERE email = 'robert.miller@company.com'),
    (SELECT id FROM projects WHERE name = 'Security Audit'),
    8,
    allocation_date,
    'active'
  WHERE EXISTS (SELECT 1 FROM employees WHERE email = 'robert.miller@company.com')
    AND EXISTS (SELECT 1 FROM projects WHERE name = 'Security Audit');
END $$;

-- Insert skills
INSERT INTO skills (name, category, description) VALUES
  ('JavaScript', 'Programming', 'JavaScript programming language'),
  ('React', 'Framework', 'React.js framework'),
  ('Python', 'Programming', 'Python programming language'),
  ('PostgreSQL', 'Database', 'PostgreSQL database'),
  ('AWS', 'Cloud', 'Amazon Web Services'),
  ('Docker', 'DevOps', 'Docker containerization'),
  ('UI/UX Design', 'Design', 'User interface and experience design'),
  ('Agile', 'Methodology', 'Agile project management'),
  ('TypeScript', 'Programming', 'TypeScript programming language'),
  ('Node.js', 'Runtime', 'Node.js runtime environment')
ON CONFLICT (name) DO NOTHING;
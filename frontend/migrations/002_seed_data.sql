-- Migration: 002_seed_data.sql
-- Description: Insert seed data for departments and common skills
-- Author: Database Architect Agent
-- Date: 2025-09-04

BEGIN;

-- Insert departments
INSERT INTO departments (id, name, description, budget, location, is_active) VALUES
  (uuid_generate_v4(), 'Engineering', 'Software development and technical operations', 2500000.00, 'San Francisco', true),
  (uuid_generate_v4(), 'Product Management', 'Product strategy and roadmap planning', 800000.00, 'San Francisco', true),
  (uuid_generate_v4(), 'Design', 'User experience and interface design', 600000.00, 'San Francisco', true),
  (uuid_generate_v4(), 'Data Science', 'Data analysis and machine learning', 1200000.00, 'Remote', true),
  (uuid_generate_v4(), 'Marketing', 'Brand marketing and customer acquisition', 900000.00, 'New York', true),
  (uuid_generate_v4(), 'Sales', 'Revenue generation and customer relationships', 1800000.00, 'New York', true),
  (uuid_generate_v4(), 'Human Resources', 'People operations and talent management', 500000.00, 'San Francisco', true),
  (uuid_generate_v4(), 'Finance', 'Financial planning and accounting', 400000.00, 'Remote', true),
  (uuid_generate_v4(), 'Operations', 'Business operations and process optimization', 700000.00, 'Austin', true),
  (uuid_generate_v4(), 'Customer Success', 'Customer support and success management', 650000.00, 'Remote', true);

-- Insert technical skills
INSERT INTO skills (id, name, description, category, is_technical, proficiency_levels) VALUES
  -- Programming Languages
  (uuid_generate_v4(), 'JavaScript', 'Modern JavaScript programming including ES6+', 'Programming Languages', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'TypeScript', 'Statically typed JavaScript superset', 'Programming Languages', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'Python', 'Python programming for web development and data science', 'Programming Languages', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'Java', 'Enterprise Java development', 'Programming Languages', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'Go', 'Google Go programming language', 'Programming Languages', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'Rust', 'Systems programming with Rust', 'Programming Languages', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'C#', '.NET and C# development', 'Programming Languages', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'Swift', 'iOS development with Swift', 'Programming Languages', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'Kotlin', 'Android development with Kotlin', 'Programming Languages', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  
  -- Frontend Technologies
  (uuid_generate_v4(), 'React', 'React.js library for building user interfaces', 'Frontend', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'Vue.js', 'Progressive JavaScript framework', 'Frontend', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'Angular', 'TypeScript-based web application framework', 'Frontend', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'HTML/CSS', 'Web markup and styling fundamentals', 'Frontend', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'Sass/SCSS', 'CSS preprocessor', 'Frontend', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'Tailwind CSS', 'Utility-first CSS framework', 'Frontend', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  
  -- Backend Technologies
  (uuid_generate_v4(), 'Node.js', 'Server-side JavaScript runtime', 'Backend', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'Express.js', 'Web application framework for Node.js', 'Backend', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'Django', 'High-level Python web framework', 'Backend', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'FastAPI', 'Modern Python web framework', 'Backend', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'Spring Boot', 'Java framework for building microservices', 'Backend', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'GraphQL', 'Query language for APIs', 'Backend', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'REST APIs', 'RESTful web services design and implementation', 'Backend', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  
  -- Databases
  (uuid_generate_v4(), 'PostgreSQL', 'Advanced open-source relational database', 'Databases', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'MySQL', 'Popular open-source relational database', 'Databases', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'MongoDB', 'Document-oriented NoSQL database', 'Databases', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'Redis', 'In-memory data structure store', 'Databases', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'Elasticsearch', 'Distributed search and analytics engine', 'Databases', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  
  -- DevOps & Cloud
  (uuid_generate_v4(), 'Docker', 'Containerization platform', 'DevOps', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'Kubernetes', 'Container orchestration platform', 'DevOps', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'AWS', 'Amazon Web Services cloud platform', 'DevOps', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'Google Cloud Platform', 'Google cloud services', 'DevOps', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'Azure', 'Microsoft cloud computing platform', 'DevOps', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'Terraform', 'Infrastructure as Code tool', 'DevOps', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'CI/CD', 'Continuous Integration and Continuous Deployment', 'DevOps', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  
  -- Data & Analytics
  (uuid_generate_v4(), 'SQL', 'Structured Query Language', 'Data & Analytics', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'Machine Learning', 'ML algorithms and model development', 'Data & Analytics', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'TensorFlow', 'Machine learning framework', 'Data & Analytics', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'PyTorch', 'Deep learning framework', 'Data & Analytics', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'Pandas', 'Data manipulation and analysis library', 'Data & Analytics', true, '["Beginner", "Intermediate", "Advanced", "Expert"]'),
  (uuid_generate_v4(), 'Apache Spark', 'Unified analytics engine for big data', 'Data & Analytics', true, '["Beginner", "Intermediate", "Advanced", "Expert"]');

-- Insert soft skills
INSERT INTO skills (id, name, description, category, is_technical, proficiency_levels) VALUES
  (uuid_generate_v4(), 'Leadership', 'Ability to guide and inspire teams', 'Soft Skills', false, '["Developing", "Competent", "Proficient", "Expert"]'),
  (uuid_generate_v4(), 'Communication', 'Effective verbal and written communication', 'Soft Skills', false, '["Developing", "Competent", "Proficient", "Expert"]'),
  (uuid_generate_v4(), 'Project Management', 'Planning and executing projects successfully', 'Soft Skills', false, '["Developing", "Competent", "Proficient", "Expert"]'),
  (uuid_generate_v4(), 'Problem Solving', 'Analytical thinking and solution development', 'Soft Skills', false, '["Developing", "Competent", "Proficient", "Expert"]'),
  (uuid_generate_v4(), 'Team Collaboration', 'Working effectively in team environments', 'Soft Skills', false, '["Developing", "Competent", "Proficient", "Expert"]'),
  (uuid_generate_v4(), 'Mentoring', 'Guiding and developing junior team members', 'Soft Skills', false, '["Developing", "Competent", "Proficient", "Expert"]'),
  (uuid_generate_v4(), 'Agile Methodologies', 'Scrum, Kanban, and agile practices', 'Methodologies', false, '["Developing", "Competent", "Proficient", "Expert"]'),
  (uuid_generate_v4(), 'Strategic Thinking', 'Long-term planning and vision development', 'Soft Skills', false, '["Developing", "Competent", "Proficient", "Expert"]'),
  (uuid_generate_v4(), 'Customer Focus', 'Understanding and addressing customer needs', 'Soft Skills', false, '["Developing", "Competent", "Proficient", "Expert"]'),
  (uuid_generate_v4(), 'Data-Driven Decision Making', 'Using data to inform business decisions', 'Soft Skills', false, '["Developing", "Competent", "Proficient", "Expert"]');

COMMIT;
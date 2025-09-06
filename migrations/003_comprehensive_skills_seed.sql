-- Migration: 003_comprehensive_skills_seed.sql
-- Description: Team Moon - 79 comprehensive skills across 5 categories for resource filtering
-- Author: Team Moon Skills Specialist
-- Date: 2025-09-05

BEGIN;

-- Insert all 79 skills across 5 categories (technical, soft, domain, certification, language)
INSERT INTO skills (id, name, description, category, is_technical) VALUES

-- TECHNICAL SKILLS (45 skills) --
-- Programming Languages (15)
(uuid_generate_v4(), 'JavaScript', 'Modern JavaScript ES6+ programming', 'technical', true),
(uuid_generate_v4(), 'TypeScript', 'Statically typed JavaScript superset', 'technical', true),
(uuid_generate_v4(), 'Python', 'Python programming for web and data science', 'technical', true),
(uuid_generate_v4(), 'Java', 'Enterprise Java development', 'technical', true),
(uuid_generate_v4(), 'Go', 'Google Go systems programming', 'technical', true),
(uuid_generate_v4(), 'Rust', 'Memory-safe systems programming', 'technical', true),
(uuid_generate_v4(), 'C#', '.NET framework development', 'technical', true),
(uuid_generate_v4(), 'Swift', 'iOS mobile development', 'technical', true),
(uuid_generate_v4(), 'Kotlin', 'Android and multiplatform development', 'technical', true),
(uuid_generate_v4(), 'PHP', 'Web development and scripting', 'technical', true),
(uuid_generate_v4(), 'Ruby', 'Dynamic web application development', 'technical', true),
(uuid_generate_v4(), 'C++', 'High-performance system programming', 'technical', true),
(uuid_generate_v4(), 'Scala', 'Functional programming on JVM', 'technical', true),
(uuid_generate_v4(), 'Dart', 'Flutter cross-platform development', 'technical', true),
(uuid_generate_v4(), 'R', 'Statistical computing and data analysis', 'technical', true),

-- Frontend Technologies (10)
(uuid_generate_v4(), 'React', 'Component-based UI library', 'technical', true),
(uuid_generate_v4(), 'Vue.js', 'Progressive JavaScript framework', 'technical', true),
(uuid_generate_v4(), 'Angular', 'Full-stack TypeScript framework', 'technical', true),
(uuid_generate_v4(), 'Svelte', 'Compile-time UI framework', 'technical', true),
(uuid_generate_v4(), 'HTML/CSS', 'Web markup and styling', 'technical', true),
(uuid_generate_v4(), 'Sass/SCSS', 'CSS preprocessor', 'technical', true),
(uuid_generate_v4(), 'Tailwind CSS', 'Utility-first CSS framework', 'technical', true),
(uuid_generate_v4(), 'Bootstrap', 'Responsive UI component library', 'technical', true),
(uuid_generate_v4(), 'Webpack', 'Module bundler and build tool', 'technical', true),
(uuid_generate_v4(), 'Vite', 'Fast build tool and dev server', 'technical', true),

-- Backend & Infrastructure (10)
(uuid_generate_v4(), 'Node.js', 'Server-side JavaScript runtime', 'technical', true),
(uuid_generate_v4(), 'Express.js', 'Minimalist Node.js web framework', 'technical', true),
(uuid_generate_v4(), 'Django', 'High-level Python web framework', 'technical', true),
(uuid_generate_v4(), 'FastAPI', 'Modern async Python framework', 'technical', true),
(uuid_generate_v4(), 'Spring Boot', 'Java microservices framework', 'technical', true),
(uuid_generate_v4(), 'GraphQL', 'Query language and runtime', 'technical', true),
(uuid_generate_v4(), 'REST APIs', 'RESTful web services', 'technical', true),
(uuid_generate_v4(), 'Docker', 'Application containerization', 'technical', true),
(uuid_generate_v4(), 'Kubernetes', 'Container orchestration', 'technical', true),
(uuid_generate_v4(), 'Microservices', 'Distributed system architecture', 'technical', true),

-- Data & Analytics (10)
(uuid_generate_v4(), 'SQL', 'Structured query language', 'technical', true),
(uuid_generate_v4(), 'PostgreSQL', 'Advanced relational database', 'technical', true),
(uuid_generate_v4(), 'MongoDB', 'Document-oriented NoSQL', 'technical', true),
(uuid_generate_v4(), 'Redis', 'In-memory data store', 'technical', true),
(uuid_generate_v4(), 'Elasticsearch', 'Distributed search engine', 'technical', true),
(uuid_generate_v4(), 'Machine Learning', 'ML algorithms and modeling', 'technical', true),
(uuid_generate_v4(), 'TensorFlow', 'ML framework by Google', 'technical', true),
(uuid_generate_v4(), 'PyTorch', 'Deep learning framework', 'technical', true),
(uuid_generate_v4(), 'Apache Spark', 'Big data processing engine', 'technical', true),
(uuid_generate_v4(), 'Tableau', 'Business intelligence visualization', 'technical', true),

-- SOFT SKILLS (12 skills) --
(uuid_generate_v4(), 'Leadership', 'Team guidance and vision setting', 'soft', false),
(uuid_generate_v4(), 'Communication', 'Effective verbal and written skills', 'soft', false),
(uuid_generate_v4(), 'Project Management', 'Planning and execution expertise', 'soft', false),
(uuid_generate_v4(), 'Problem Solving', 'Analytical thinking and resolution', 'soft', false),
(uuid_generate_v4(), 'Team Collaboration', 'Cross-functional teamwork', 'soft', false),
(uuid_generate_v4(), 'Mentoring', 'Junior developer guidance', 'soft', false),
(uuid_generate_v4(), 'Strategic Thinking', 'Long-term planning and vision', 'soft', false),
(uuid_generate_v4(), 'Customer Focus', 'User-centric approach', 'soft', false),
(uuid_generate_v4(), 'Adaptability', 'Flexibility in changing environments', 'soft', false),
(uuid_generate_v4(), 'Critical Thinking', 'Objective analysis and evaluation', 'soft', false),
(uuid_generate_v4(), 'Creativity', 'Innovative solution development', 'soft', false),
(uuid_generate_v4(), 'Time Management', 'Efficient priority and schedule management', 'soft', false),

-- DOMAIN EXPERTISE (10 skills) --
(uuid_generate_v4(), 'E-commerce', 'Online retail platform expertise', 'domain', false),
(uuid_generate_v4(), 'FinTech', 'Financial technology solutions', 'domain', false),
(uuid_generate_v4(), 'Healthcare', 'Medical software and compliance', 'domain', false),
(uuid_generate_v4(), 'EdTech', 'Educational technology platforms', 'domain', false),
(uuid_generate_v4(), 'Gaming', 'Game development and mechanics', 'domain', false),
(uuid_generate_v4(), 'IoT', 'Internet of Things systems', 'domain', false),
(uuid_generate_v4(), 'Blockchain', 'Distributed ledger technology', 'domain', false),
(uuid_generate_v4(), 'Cybersecurity', 'Information security practices', 'domain', false),
(uuid_generate_v4(), 'DevOps', 'Development operations integration', 'domain', false),
(uuid_generate_v4(), 'AI/ML', 'Artificial intelligence applications', 'domain', false),

-- CERTIFICATIONS (7 skills) --
(uuid_generate_v4(), 'AWS Certified', 'Amazon Web Services certification', 'certification', true),
(uuid_generate_v4(), 'Google Cloud Professional', 'GCP professional certification', 'certification', true),
(uuid_generate_v4(), 'Azure Fundamentals', 'Microsoft Azure certification', 'certification', true),
(uuid_generate_v4(), 'Scrum Master', 'Agile methodology certification', 'certification', false),
(uuid_generate_v4(), 'PMP', 'Project Management Professional', 'certification', false),
(uuid_generate_v4(), 'Kubernetes Administrator', 'CKA certification', 'certification', true),
(uuid_generate_v4(), 'Security+', 'CompTIA Security+ certification', 'certification', true),

-- LANGUAGES (5 skills) --
(uuid_generate_v4(), 'English', 'Native or fluent English proficiency', 'language', false),
(uuid_generate_v4(), 'Spanish', 'Spanish language proficiency', 'language', false),
(uuid_generate_v4(), 'Mandarin', 'Mandarin Chinese proficiency', 'language', false),
(uuid_generate_v4(), 'German', 'German language proficiency', 'language', false),
(uuid_generate_v4(), 'Japanese', 'Japanese language proficiency', 'language', false);

-- Create skill category statistics view
CREATE OR REPLACE VIEW skill_category_stats AS
SELECT 
    category,
    COUNT(*) as total_skills,
    COUNT(CASE WHEN is_technical = true THEN 1 END) as technical_count,
    COUNT(CASE WHEN is_technical = false THEN 1 END) as non_technical_count
FROM skills 
WHERE deleted_at IS NULL AND is_active = true
GROUP BY category
ORDER BY total_skills DESC;

COMMIT;
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseSeeder = void 0;
const types_1 = require("../types");
class DatabaseSeeder {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async seedAll() {
        console.log('Starting database seeding...');
        try {
            await this.seedDepartments();
            await this.seedSkills();
            console.log('Database seeding completed successfully');
        }
        catch (error) {
            console.error('Database seeding failed:', error);
            throw error;
        }
    }
    async seedDepartments() {
        console.log('Seeding departments...');
        const departments = [
            {
                name: 'Engineering',
                description: 'Software development and technical innovation'
            },
            {
                name: 'Human Resources',
                description: 'People operations and talent management'
            },
            {
                name: 'Marketing',
                description: 'Brand promotion and customer acquisition'
            },
            {
                name: 'Sales',
                description: 'Revenue generation and client relationships'
            },
            {
                name: 'Finance',
                description: 'Financial planning and budget management'
            },
            {
                name: 'Operations',
                description: 'Business operations and process optimization'
            },
            {
                name: 'Product',
                description: 'Product strategy and development'
            },
            {
                name: 'Design',
                description: 'User experience and visual design'
            },
            {
                name: 'Data Science',
                description: 'Data analysis and machine learning'
            },
            {
                name: 'Quality Assurance',
                description: 'Software testing and quality control'
            }
        ];
        for (const dept of departments) {
            await this.pool.query(`INSERT INTO departments (name, description, is_active) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (name) DO NOTHING`, [dept.name, dept.description, true]);
        }
        console.log(`Seeded ${departments.length} departments`);
    }
    async seedSkills() {
        console.log('Seeding skills...');
        const skills = [
            // Technical Skills
            { name: 'JavaScript', category: types_1.SkillCategory.TECHNICAL, description: 'Programming language for web development' },
            { name: 'TypeScript', category: types_1.SkillCategory.TECHNICAL, description: 'Typed superset of JavaScript' },
            { name: 'Node.js', category: types_1.SkillCategory.TECHNICAL, description: 'JavaScript runtime for server-side development' },
            { name: 'React', category: types_1.SkillCategory.TECHNICAL, description: 'JavaScript library for building user interfaces' },
            { name: 'Vue.js', category: types_1.SkillCategory.TECHNICAL, description: 'Progressive JavaScript framework' },
            { name: 'Angular', category: types_1.SkillCategory.TECHNICAL, description: 'TypeScript-based web application framework' },
            { name: 'Python', category: types_1.SkillCategory.TECHNICAL, description: 'High-level programming language' },
            { name: 'Django', category: types_1.SkillCategory.TECHNICAL, description: 'Python web framework' },
            { name: 'Flask', category: types_1.SkillCategory.TECHNICAL, description: 'Lightweight Python web framework' },
            { name: 'Java', category: types_1.SkillCategory.TECHNICAL, description: 'Object-oriented programming language' },
            { name: 'Spring Boot', category: types_1.SkillCategory.TECHNICAL, description: 'Java framework for building applications' },
            { name: 'C#', category: types_1.SkillCategory.TECHNICAL, description: 'Microsoft programming language' },
            { name: '.NET', category: types_1.SkillCategory.TECHNICAL, description: 'Microsoft development platform' },
            { name: 'PHP', category: types_1.SkillCategory.TECHNICAL, description: 'Server-side scripting language' },
            { name: 'Laravel', category: types_1.SkillCategory.TECHNICAL, description: 'PHP web framework' },
            { name: 'Ruby', category: types_1.SkillCategory.TECHNICAL, description: 'Dynamic programming language' },
            { name: 'Ruby on Rails', category: types_1.SkillCategory.TECHNICAL, description: 'Ruby web framework' },
            { name: 'Go', category: types_1.SkillCategory.TECHNICAL, description: 'Google programming language' },
            { name: 'Rust', category: types_1.SkillCategory.TECHNICAL, description: 'Systems programming language' },
            { name: 'Swift', category: types_1.SkillCategory.TECHNICAL, description: 'Apple programming language' },
            { name: 'Kotlin', category: types_1.SkillCategory.TECHNICAL, description: 'JVM programming language' },
            { name: 'HTML', category: types_1.SkillCategory.TECHNICAL, description: 'Markup language for web pages' },
            { name: 'CSS', category: types_1.SkillCategory.TECHNICAL, description: 'Style sheet language' },
            { name: 'SASS/SCSS', category: types_1.SkillCategory.TECHNICAL, description: 'CSS preprocessor' },
            { name: 'SQL', category: types_1.SkillCategory.TECHNICAL, description: 'Database query language' },
            { name: 'PostgreSQL', category: types_1.SkillCategory.TECHNICAL, description: 'Open source relational database' },
            { name: 'MySQL', category: types_1.SkillCategory.TECHNICAL, description: 'Relational database management system' },
            { name: 'MongoDB', category: types_1.SkillCategory.TECHNICAL, description: 'NoSQL document database' },
            { name: 'Redis', category: types_1.SkillCategory.TECHNICAL, description: 'In-memory data structure store' },
            { name: 'Docker', category: types_1.SkillCategory.TECHNICAL, description: 'Containerization platform' },
            { name: 'Kubernetes', category: types_1.SkillCategory.TECHNICAL, description: 'Container orchestration platform' },
            { name: 'AWS', category: types_1.SkillCategory.TECHNICAL, description: 'Amazon Web Services cloud platform' },
            { name: 'Azure', category: types_1.SkillCategory.TECHNICAL, description: 'Microsoft cloud platform' },
            { name: 'Google Cloud Platform', category: types_1.SkillCategory.TECHNICAL, description: 'Google cloud services' },
            { name: 'Git', category: types_1.SkillCategory.TECHNICAL, description: 'Version control system' },
            { name: 'CI/CD', category: types_1.SkillCategory.TECHNICAL, description: 'Continuous integration and deployment' },
            { name: 'Jest', category: types_1.SkillCategory.TECHNICAL, description: 'JavaScript testing framework' },
            { name: 'Cypress', category: types_1.SkillCategory.TECHNICAL, description: 'End-to-end testing framework' },
            { name: 'Machine Learning', category: types_1.SkillCategory.TECHNICAL, description: 'AI and ML algorithms' },
            { name: 'TensorFlow', category: types_1.SkillCategory.TECHNICAL, description: 'Machine learning framework' },
            { name: 'PyTorch', category: types_1.SkillCategory.TECHNICAL, description: 'Machine learning framework' },
            // Soft Skills
            { name: 'Leadership', category: types_1.SkillCategory.SOFT, description: 'Ability to guide and inspire teams' },
            { name: 'Communication', category: types_1.SkillCategory.SOFT, description: 'Effective verbal and written communication' },
            { name: 'Team Collaboration', category: types_1.SkillCategory.SOFT, description: 'Working effectively with others' },
            { name: 'Problem Solving', category: types_1.SkillCategory.SOFT, description: 'Analytical thinking and solution finding' },
            { name: 'Critical Thinking', category: types_1.SkillCategory.SOFT, description: 'Objective analysis and evaluation' },
            { name: 'Time Management', category: types_1.SkillCategory.SOFT, description: 'Efficient use of time and prioritization' },
            { name: 'Adaptability', category: types_1.SkillCategory.SOFT, description: 'Flexibility in changing environments' },
            { name: 'Creativity', category: types_1.SkillCategory.SOFT, description: 'Innovative thinking and ideation' },
            { name: 'Emotional Intelligence', category: types_1.SkillCategory.SOFT, description: 'Understanding and managing emotions' },
            { name: 'Mentoring', category: types_1.SkillCategory.SOFT, description: 'Guiding junior team members' },
            { name: 'Presentation Skills', category: types_1.SkillCategory.SOFT, description: 'Effective public speaking' },
            { name: 'Negotiation', category: types_1.SkillCategory.SOFT, description: 'Reaching mutually beneficial agreements' },
            { name: 'Customer Service', category: types_1.SkillCategory.SOFT, description: 'Meeting customer needs effectively' },
            // Languages
            { name: 'English', category: types_1.SkillCategory.LANGUAGE, description: 'English language proficiency' },
            { name: 'Spanish', category: types_1.SkillCategory.LANGUAGE, description: 'Spanish language proficiency' },
            { name: 'French', category: types_1.SkillCategory.LANGUAGE, description: 'French language proficiency' },
            { name: 'German', category: types_1.SkillCategory.LANGUAGE, description: 'German language proficiency' },
            { name: 'Mandarin', category: types_1.SkillCategory.LANGUAGE, description: 'Mandarin Chinese proficiency' },
            { name: 'Japanese', category: types_1.SkillCategory.LANGUAGE, description: 'Japanese language proficiency' },
            { name: 'Korean', category: types_1.SkillCategory.LANGUAGE, description: 'Korean language proficiency' },
            // Certifications
            { name: 'AWS Certified Solutions Architect', category: types_1.SkillCategory.CERTIFICATION, description: 'AWS cloud architecture certification' },
            { name: 'Google Cloud Professional', category: types_1.SkillCategory.CERTIFICATION, description: 'Google Cloud Platform certification' },
            { name: 'Microsoft Azure Fundamentals', category: types_1.SkillCategory.CERTIFICATION, description: 'Azure cloud certification' },
            { name: 'PMP', category: types_1.SkillCategory.CERTIFICATION, description: 'Project Management Professional' },
            { name: 'Scrum Master', category: types_1.SkillCategory.CERTIFICATION, description: 'Agile Scrum methodology certification' },
            { name: 'CISSP', category: types_1.SkillCategory.CERTIFICATION, description: 'Information security certification' },
            // Domain Skills
            { name: 'E-commerce', category: types_1.SkillCategory.DOMAIN, description: 'Online retail and marketplace expertise' },
            { name: 'FinTech', category: types_1.SkillCategory.DOMAIN, description: 'Financial technology domain knowledge' },
            { name: 'Healthcare', category: types_1.SkillCategory.DOMAIN, description: 'Healthcare industry expertise' },
            { name: 'Education Technology', category: types_1.SkillCategory.DOMAIN, description: 'EdTech domain knowledge' },
            { name: 'Gaming', category: types_1.SkillCategory.DOMAIN, description: 'Video game industry expertise' },
            { name: 'SaaS', category: types_1.SkillCategory.DOMAIN, description: 'Software as a Service expertise' },
            { name: 'Blockchain', category: types_1.SkillCategory.DOMAIN, description: 'Distributed ledger technology' },
            { name: 'IoT', category: types_1.SkillCategory.DOMAIN, description: 'Internet of Things expertise' },
            { name: 'Cybersecurity', category: types_1.SkillCategory.DOMAIN, description: 'Information security domain' },
            { name: 'Data Analytics', category: types_1.SkillCategory.DOMAIN, description: 'Data analysis and insights' },
            { name: 'Digital Marketing', category: types_1.SkillCategory.DOMAIN, description: 'Online marketing strategies' },
            { name: 'UX/UI Design', category: types_1.SkillCategory.DOMAIN, description: 'User experience and interface design' }
        ];
        for (const skill of skills) {
            await this.pool.query(`INSERT INTO skills (name, description, category, is_active) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (name) DO NOTHING`, [skill.name, skill.description, skill.category, true]);
        }
        console.log(`Seeded ${skills.length} skills`);
    }
    async clearData() {
        console.log('Clearing existing seed data...');
        const tables = [
            'capacity_history',
            'employee_skills',
            'employees',
            'skills',
            'departments'
        ];
        for (const table of tables) {
            await this.pool.query(`TRUNCATE TABLE ${table} CASCADE`);
        }
        console.log('Seed data cleared');
    }
}
exports.DatabaseSeeder = DatabaseSeeder;
//# sourceMappingURL=seeder.js.map
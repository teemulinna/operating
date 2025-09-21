import { Pool } from 'pg';

export enum SkillCategory {
  TECHNICAL = 'technical',
  SOFT = 'soft',
  LANGUAGE = 'language',
  CERTIFICATION = 'certification',
  DOMAIN = 'domain'
}

export class DatabaseSeeder {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async seedAll(): Promise<void> {
    console.log('Starting database seeding...');
    try {
      await this.seedDepartments();
      await this.seedSkills();
      console.log('Database seeding completed successfully');
    } catch (error) {
      console.error('Database seeding failed:', error);
      throw error;
    }
  }

  async seedDepartments(): Promise<void> {
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
      await this.pool.query(
        `INSERT INTO departments (name, description, is_active)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING`,
        [dept.name, dept.description, true]
      );
    }

    console.log(`Seeded ${departments.length} departments`);
  }

  async seedSkills(): Promise<void> {
    console.log('Seeding skills...');
    const skills = [
      { name: 'JavaScript', category: SkillCategory.TECHNICAL, description: 'Programming language for web development' },
      { name: 'TypeScript', category: SkillCategory.TECHNICAL, description: 'Typed superset of JavaScript' },
      { name: 'Node.js', category: SkillCategory.TECHNICAL, description: 'JavaScript runtime for server-side development' },
      { name: 'React', category: SkillCategory.TECHNICAL, description: 'JavaScript library for building user interfaces' },
      { name: 'Vue.js', category: SkillCategory.TECHNICAL, description: 'Progressive JavaScript framework' },
      { name: 'Angular', category: SkillCategory.TECHNICAL, description: 'TypeScript-based web application framework' },
      { name: 'Python', category: SkillCategory.TECHNICAL, description: 'High-level programming language' },
      { name: 'Django', category: SkillCategory.TECHNICAL, description: 'Python web framework' },
      { name: 'Flask', category: SkillCategory.TECHNICAL, description: 'Lightweight Python web framework' },
      { name: 'Java', category: SkillCategory.TECHNICAL, description: 'Object-oriented programming language' },
      { name: 'Spring Boot', category: SkillCategory.TECHNICAL, description: 'Java framework for building applications' },
      { name: 'C#', category: SkillCategory.TECHNICAL, description: 'Microsoft programming language' },
      { name: '.NET', category: SkillCategory.TECHNICAL, description: 'Microsoft development platform' },
      { name: 'PHP', category: SkillCategory.TECHNICAL, description: 'Server-side scripting language' },
      { name: 'Laravel', category: SkillCategory.TECHNICAL, description: 'PHP web framework' },
      { name: 'Ruby', category: SkillCategory.TECHNICAL, description: 'Dynamic programming language' },
      { name: 'Ruby on Rails', category: SkillCategory.TECHNICAL, description: 'Ruby web framework' },
      { name: 'Go', category: SkillCategory.TECHNICAL, description: 'Google programming language' },
      { name: 'Rust', category: SkillCategory.TECHNICAL, description: 'Systems programming language' },
      { name: 'Swift', category: SkillCategory.TECHNICAL, description: 'Apple programming language' },
      { name: 'Kotlin', category: SkillCategory.TECHNICAL, description: 'JVM programming language' },
      { name: 'HTML', category: SkillCategory.TECHNICAL, description: 'Markup language for web pages' },
      { name: 'CSS', category: SkillCategory.TECHNICAL, description: 'Style sheet language' },
      { name: 'SASS/SCSS', category: SkillCategory.TECHNICAL, description: 'CSS preprocessor' },
      { name: 'SQL', category: SkillCategory.TECHNICAL, description: 'Database query language' },
      { name: 'PostgreSQL', category: SkillCategory.TECHNICAL, description: 'Open source relational database' },
      { name: 'MySQL', category: SkillCategory.TECHNICAL, description: 'Relational database management system' },
      { name: 'MongoDB', category: SkillCategory.TECHNICAL, description: 'NoSQL document database' },
      { name: 'Redis', category: SkillCategory.TECHNICAL, description: 'In-memory data structure store' },
      { name: 'Docker', category: SkillCategory.TECHNICAL, description: 'Containerization platform' },
      { name: 'Kubernetes', category: SkillCategory.TECHNICAL, description: 'Container orchestration platform' },
      { name: 'AWS', category: SkillCategory.TECHNICAL, description: 'Amazon Web Services cloud platform' },
      { name: 'Azure', category: SkillCategory.TECHNICAL, description: 'Microsoft cloud platform' },
      { name: 'Google Cloud Platform', category: SkillCategory.TECHNICAL, description: 'Google cloud services' },
      { name: 'Git', category: SkillCategory.TECHNICAL, description: 'Version control system' },
      { name: 'CI/CD', category: SkillCategory.TECHNICAL, description: 'Continuous integration and deployment' },
      { name: 'Jest', category: SkillCategory.TECHNICAL, description: 'JavaScript testing framework' },
      { name: 'Cypress', category: SkillCategory.TECHNICAL, description: 'End-to-end testing framework' },
      { name: 'Machine Learning', category: SkillCategory.TECHNICAL, description: 'AI and ML algorithms' },
      { name: 'TensorFlow', category: SkillCategory.TECHNICAL, description: 'Machine learning framework' },
      { name: 'PyTorch', category: SkillCategory.TECHNICAL, description: 'Machine learning framework' },
      { name: 'Leadership', category: SkillCategory.SOFT, description: 'Ability to guide and inspire teams' },
      { name: 'Communication', category: SkillCategory.SOFT, description: 'Effective verbal and written communication' },
      { name: 'Team Collaboration', category: SkillCategory.SOFT, description: 'Working effectively with others' },
      { name: 'Problem Solving', category: SkillCategory.SOFT, description: 'Analytical thinking and solution finding' },
      { name: 'Critical Thinking', category: SkillCategory.SOFT, description: 'Objective analysis and evaluation' },
      { name: 'Time Management', category: SkillCategory.SOFT, description: 'Efficient use of time and prioritization' },
      { name: 'Adaptability', category: SkillCategory.SOFT, description: 'Flexibility in changing environments' },
      { name: 'Creativity', category: SkillCategory.SOFT, description: 'Innovative thinking and ideation' },
      { name: 'Emotional Intelligence', category: SkillCategory.SOFT, description: 'Understanding and managing emotions' },
      { name: 'Mentoring', category: SkillCategory.SOFT, description: 'Guiding junior team members' },
      { name: 'Presentation Skills', category: SkillCategory.SOFT, description: 'Effective public speaking' },
      { name: 'Negotiation', category: SkillCategory.SOFT, description: 'Reaching mutually beneficial agreements' },
      { name: 'Customer Service', category: SkillCategory.SOFT, description: 'Meeting customer needs effectively' },
      { name: 'English', category: SkillCategory.LANGUAGE, description: 'English language proficiency' },
      { name: 'Spanish', category: SkillCategory.LANGUAGE, description: 'Spanish language proficiency' },
      { name: 'French', category: SkillCategory.LANGUAGE, description: 'French language proficiency' },
      { name: 'German', category: SkillCategory.LANGUAGE, description: 'German language proficiency' },
      { name: 'Mandarin', category: SkillCategory.LANGUAGE, description: 'Mandarin Chinese proficiency' },
      { name: 'Japanese', category: SkillCategory.LANGUAGE, description: 'Japanese language proficiency' },
      { name: 'Korean', category: SkillCategory.LANGUAGE, description: 'Korean language proficiency' },
      { name: 'AWS Certified Solutions Architect', category: SkillCategory.CERTIFICATION, description: 'AWS cloud architecture certification' },
      { name: 'Google Cloud Professional', category: SkillCategory.CERTIFICATION, description: 'Google Cloud Platform certification' },
      { name: 'Microsoft Azure Fundamentals', category: SkillCategory.CERTIFICATION, description: 'Azure cloud certification' },
      { name: 'PMP', category: SkillCategory.CERTIFICATION, description: 'Project Management Professional' },
      { name: 'Scrum Master', category: SkillCategory.CERTIFICATION, description: 'Agile Scrum methodology certification' },
      { name: 'CISSP', category: SkillCategory.CERTIFICATION, description: 'Information security certification' },
      { name: 'E-commerce', category: SkillCategory.DOMAIN, description: 'Online retail and marketplace expertise' },
      { name: 'FinTech', category: SkillCategory.DOMAIN, description: 'Financial technology domain knowledge' },
      { name: 'Healthcare', category: SkillCategory.DOMAIN, description: 'Healthcare industry expertise' },
      { name: 'Education Technology', category: SkillCategory.DOMAIN, description: 'EdTech domain knowledge' },
      { name: 'Gaming', category: SkillCategory.DOMAIN, description: 'Video game industry expertise' },
      { name: 'SaaS', category: SkillCategory.DOMAIN, description: 'Software as a Service expertise' },
      { name: 'Blockchain', category: SkillCategory.DOMAIN, description: 'Distributed ledger technology' },
      { name: 'IoT', category: SkillCategory.DOMAIN, description: 'Internet of Things expertise' },
      { name: 'Cybersecurity', category: SkillCategory.DOMAIN, description: 'Information security domain' },
      { name: 'Data Analytics', category: SkillCategory.DOMAIN, description: 'Data analysis and insights' },
      { name: 'Digital Marketing', category: SkillCategory.DOMAIN, description: 'Online marketing strategies' },
      { name: 'UX/UI Design', category: SkillCategory.DOMAIN, description: 'User experience and interface design' }
    ];

    for (const skill of skills) {
      await this.pool.query(
        `INSERT INTO skills (name, description, category, is_active)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (name) DO NOTHING`,
        [skill.name, skill.description, skill.category, true]
      );
    }

    console.log(`Seeded ${skills.length} skills`);
  }

  async clearData(): Promise<void> {
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
# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-09-03-employee-management/spec.md

> Created: 2025-09-03
> Version: 1.0.0

## Schema Changes

### Core Tables

#### 1. employees
Primary table storing all employee information with normalized structure for optimal performance.

```sql
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) UNIQUE NOT NULL, -- Human-readable employee ID
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    department_id UUID NOT NULL REFERENCES departments(id),
    role VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    status employee_status NOT NULL DEFAULT 'active',
    weekly_hours DECIMAL(4,2) NOT NULL CHECK (weekly_hours >= 0 AND weekly_hours <= 80),
    current_utilization DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (current_utilization >= 0 AND current_utilization <= 100),
    availability_status availability_status NOT NULL DEFAULT 'available',
    capacity_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID, -- Future reference to user who created record
    updated_by UUID  -- Future reference to user who last updated record
);
```

#### 2. departments
Reference table for organizational departments.

```sql
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. skills
Master table for all available skills and competencies.

```sql
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. employee_skills
Junction table managing many-to-many relationship between employees and skills with experience tracking.

```sql
CREATE TABLE employee_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    experience_level experience_level NOT NULL,
    years_of_experience INTEGER CHECK (years_of_experience >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, skill_id)
);
```

#### 5. capacity_history
Audit trail table tracking all capacity changes for compliance and analysis.

```sql
CREATE TABLE capacity_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    field_name VARCHAR(50) NOT NULL, -- 'weekly_hours', 'availability_status', etc.
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    changed_by UUID, -- Future reference to user who made the change
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Custom Types (ENUMs)

```sql
-- Employee status enumeration
CREATE TYPE employee_status AS ENUM ('active', 'inactive', 'on-leave');

-- Availability status enumeration
CREATE TYPE availability_status AS ENUM ('available', 'unavailable', 'limited');

-- Experience level enumeration
CREATE TYPE experience_level AS ENUM ('junior', 'intermediate', 'senior', 'expert');
```

### Indexes for Performance

```sql
-- Primary search and filtering indexes
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_availability ON employees(availability_status);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_name ON employees(first_name, last_name);

-- Full-text search index for employee names and roles
CREATE INDEX idx_employees_search ON employees USING gin(
    to_tsvector('english', 
        coalesce(first_name, '') || ' ' || 
        coalesce(last_name, '') || ' ' || 
        coalesce(role, '')
    )
);

-- Skills-related indexes for filtering
CREATE INDEX idx_employee_skills_employee ON employee_skills(employee_id);
CREATE INDEX idx_employee_skills_skill ON employee_skills(skill_id);
CREATE INDEX idx_employee_skills_experience ON employee_skills(experience_level);
CREATE INDEX idx_skills_category ON skills(category);
CREATE INDEX idx_skills_active ON skills(is_active);

-- Skills full-text search
CREATE INDEX idx_skills_search ON skills USING gin(
    to_tsvector('english', name || ' ' || coalesce(description, ''))
);

-- Capacity tracking indexes
CREATE INDEX idx_employees_capacity ON employees(weekly_hours, current_utilization);
CREATE INDEX idx_capacity_history_employee ON capacity_history(employee_id, created_at DESC);

-- Composite index for complex queries
CREATE INDEX idx_employees_active_available ON employees(status, availability_status) 
WHERE status = 'active';

-- Partial index for active employees only (most common queries)
CREATE INDEX idx_employees_active_search ON employees(first_name, last_name, role) 
WHERE status = 'active';
```

### Constraints and Data Validation

```sql
-- Additional check constraints for data integrity
ALTER TABLE employees ADD CONSTRAINT chk_employee_id_format 
CHECK (employee_id ~ '^[A-Z0-9]{3,10}$'); -- Alphanumeric 3-10 chars

ALTER TABLE employees ADD CONSTRAINT chk_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE employees ADD CONSTRAINT chk_start_date_reasonable 
CHECK (start_date >= '1900-01-01' AND start_date <= CURRENT_DATE + INTERVAL '1 year');

ALTER TABLE employee_skills ADD CONSTRAINT chk_experience_years_reasonable 
CHECK (years_of_experience IS NULL OR years_of_experience <= 50);

-- Unique constraint to prevent duplicate department names (case-insensitive)
CREATE UNIQUE INDEX idx_departments_name_unique ON departments(LOWER(name));
```

### Triggers for Audit Trail

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON skills
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_skills_updated_at BEFORE UPDATE ON employee_skills
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log capacity changes
CREATE OR REPLACE FUNCTION log_capacity_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log weekly_hours changes
    IF OLD.weekly_hours IS DISTINCT FROM NEW.weekly_hours THEN
        INSERT INTO capacity_history (employee_id, field_name, old_value, new_value, changed_by)
        VALUES (NEW.id, 'weekly_hours', OLD.weekly_hours::TEXT, NEW.weekly_hours::TEXT, NEW.updated_by);
    END IF;
    
    -- Log availability_status changes
    IF OLD.availability_status IS DISTINCT FROM NEW.availability_status THEN
        INSERT INTO capacity_history (employee_id, field_name, old_value, new_value, changed_by)
        VALUES (NEW.id, 'availability_status', OLD.availability_status::TEXT, NEW.availability_status::TEXT, NEW.updated_by);
    END IF;
    
    -- Log current_utilization changes
    IF OLD.current_utilization IS DISTINCT FROM NEW.current_utilization THEN
        INSERT INTO capacity_history (employee_id, field_name, old_value, new_value, changed_by)
        VALUES (NEW.id, 'current_utilization', OLD.current_utilization::TEXT, NEW.current_utilization::TEXT, NEW.updated_by);
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for capacity change logging
CREATE TRIGGER log_employee_capacity_changes 
AFTER UPDATE ON employees
FOR EACH ROW EXECUTE FUNCTION log_capacity_changes();
```

### Initial Data Population

```sql
-- Insert default departments
INSERT INTO departments (name, description) VALUES
('Engineering', 'Software development and technical teams'),
('Design', 'UI/UX and product design teams'),
('Product Management', 'Product strategy and management'),
('Quality Assurance', 'Testing and quality assurance'),
('DevOps', 'Infrastructure and deployment operations'),
('Data', 'Data science and analytics'),
('Marketing', 'Marketing and growth teams'),
('Sales', 'Sales and business development'),
('Human Resources', 'HR and people operations'),
('Finance', 'Financial planning and operations');

-- Insert common skill categories and skills
INSERT INTO skills (name, category) VALUES
-- Technical Skills
('JavaScript', 'Programming'),
('TypeScript', 'Programming'),
('Python', 'Programming'),
('Java', 'Programming'),
('React', 'Frontend'),
('Node.js', 'Backend'),
('PostgreSQL', 'Database'),
('MongoDB', 'Database'),
('AWS', 'Cloud'),
('Docker', 'DevOps'),
('Kubernetes', 'DevOps'),
-- Design Skills
('Figma', 'Design'),
('Adobe Creative Suite', 'Design'),
('UI Design', 'Design'),
('UX Research', 'Design'),
-- Soft Skills
('Project Management', 'Management'),
('Team Leadership', 'Management'),
('Agile/Scrum', 'Methodology'),
('Communication', 'Soft Skills'),
('Problem Solving', 'Soft Skills');
```

## Migrations

### Migration Strategy

**Migration File Structure:**
```
migrations/
├── 001_create_base_tables.sql
├── 002_create_indexes.sql
├── 003_create_triggers.sql
├── 004_insert_initial_data.sql
└── rollback/
    ├── 001_rollback.sql
    ├── 002_rollback.sql
    ├── 003_rollback.sql
    └── 004_rollback.sql
```

### Migration Execution Plan

**Phase 1: Core Schema (001_create_base_tables.sql)**
1. Create custom types (ENUMs)
2. Create departments table
3. Create skills table
4. Create employees table with foreign key constraints
5. Create employee_skills junction table
6. Create capacity_history audit table

**Phase 2: Performance Optimization (002_create_indexes.sql)**
1. Create basic indexes for foreign keys
2. Create search and filtering indexes
3. Create full-text search indexes
4. Create composite indexes for complex queries
5. Create partial indexes for active records

**Phase 3: Business Logic (003_create_triggers.sql)**
1. Create timestamp update functions
2. Create audit logging functions
3. Create triggers for automatic timestamp updates
4. Create triggers for capacity change logging

**Phase 4: Initial Data (004_insert_initial_data.sql)**
1. Insert default departments
2. Insert common skills and categories
3. Set up initial system configuration

### Rollback Strategy

**Rollback Order (reverse of migration order):**
1. Drop triggers and functions
2. Drop indexes
3. Drop foreign key constraints
4. Drop tables in dependency order
5. Drop custom types

**Safety Measures:**
- All migrations wrapped in transactions
- Rollback scripts test data dependencies before dropping
- Backup verification before executing rollbacks
- Point-in-time recovery capability for production

### Performance Impact Assessment

**During Migration:**
- Estimated downtime: 2-3 minutes for schema creation
- Index creation: 30 seconds - 2 minutes (depending on data volume)
- No impact on existing application functionality (new schema)

**Post-Migration Performance:**
- Query performance improvement: 60-80% for filtered searches
- Full-text search capability for employee and skill discovery
- Efficient joins through proper indexing
- Audit trail with minimal performance impact (<5% overhead)

**Database Size Impact:**
- Base schema: ~50KB
- Indexes: ~200KB per 10,000 employee records
- Audit trail: ~2KB per capacity change
- Full-text search indexes: ~100KB per 10,000 records

### Data Validation Queries

```sql
-- Verify referential integrity
SELECT 'employees_department' as check_name, count(*) as violations
FROM employees e LEFT JOIN departments d ON e.department_id = d.id
WHERE d.id IS NULL

UNION ALL

SELECT 'employee_skills_employee', count(*)
FROM employee_skills es LEFT JOIN employees e ON es.employee_id = e.id
WHERE e.id IS NULL

UNION ALL

SELECT 'employee_skills_skill', count(*)
FROM employee_skills es LEFT JOIN skills s ON es.skill_id = s.id
WHERE s.id IS NULL;

-- Verify data constraints
SELECT 'invalid_weekly_hours' as check_name, count(*) as violations
FROM employees 
WHERE weekly_hours < 0 OR weekly_hours > 80

UNION ALL

SELECT 'invalid_utilization', count(*)
FROM employees 
WHERE current_utilization < 0 OR current_utilization > 100;

-- Verify index usage (run after data insertion)
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats 
WHERE tablename IN ('employees', 'employee_skills', 'skills', 'departments')
ORDER BY tablename, attname;
```

This schema design provides a robust foundation for the employee management system with excellent performance characteristics, data integrity, and audit capabilities while remaining flexible for future enhancements.
-- Migration: 003_create_employees
-- Description: Create employees table with department relationship

-- Create employees table
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    department_id UUID NOT NULL,
    position VARCHAR(100) NOT NULL,
    hire_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_employees_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT
);

-- Create indexes
CREATE UNIQUE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_department_id ON employees(department_id);
CREATE INDEX idx_employees_name ON employees(last_name, first_name);
CREATE INDEX idx_employees_position ON employees(position);
CREATE INDEX idx_employees_hire_date ON employees(hire_date);
CREATE INDEX idx_employees_is_active ON employees(is_active);
CREATE INDEX idx_employees_department_active ON employees(department_id, is_active);

-- Add constraint for email format validation
ALTER TABLE employees ADD CONSTRAINT chk_employees_email_format 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Create trigger for updated_at
CREATE TRIGGER update_employees_updated_at 
    BEFORE UPDATE ON employees 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Now add the manager foreign key constraint to departments
ALTER TABLE departments ADD CONSTRAINT fk_departments_manager 
    FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;
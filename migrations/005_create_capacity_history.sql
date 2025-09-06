-- Migration: 005_create_capacity_history
-- Description: Create capacity_history table for tracking employee capacity over time

-- Create capacity_history table
CREATE TABLE capacity_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL,
    date DATE NOT NULL,
    available_hours DECIMAL(5,2) NOT NULL CHECK (available_hours >= 0),
    allocated_hours DECIMAL(5,2) NOT NULL CHECK (allocated_hours >= 0),
    utilization_rate DECIMAL(5,4) NOT NULL GENERATED ALWAYS AS (
        CASE 
            WHEN available_hours > 0 THEN allocated_hours / available_hours 
            ELSE 0 
        END
    ) STORED,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_capacity_history_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate entries for same employee and date
    CONSTRAINT uk_capacity_history_employee_date UNIQUE (employee_id, date),
    
    -- Business logic constraints
    CONSTRAINT chk_capacity_history_hours CHECK (allocated_hours <= available_hours)
);

-- Create indexes
CREATE INDEX idx_capacity_history_employee_id ON capacity_history(employee_id);
CREATE INDEX idx_capacity_history_date ON capacity_history(date);
CREATE INDEX idx_capacity_history_employee_date ON capacity_history(employee_id, date);
CREATE INDEX idx_capacity_history_utilization ON capacity_history(utilization_rate);
CREATE INDEX idx_capacity_history_date_range ON capacity_history(date DESC, employee_id);

-- Create partial index for recent data (remove WHERE clause as CURRENT_DATE is not immutable)
-- This index will need to be created manually with a specific date if needed for performance
CREATE INDEX idx_capacity_history_recent ON capacity_history(employee_id, date DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_capacity_history_updated_at 
    BEFORE UPDATE ON capacity_history 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
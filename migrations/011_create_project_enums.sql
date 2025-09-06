-- Migration: 006_create_project_enums
-- Description: Create enums for project management system

-- Create project_status enum
CREATE TYPE project_status AS ENUM (
    'planning',     -- Project is in planning phase
    'active',       -- Project is actively being worked on
    'on_hold',      -- Project is temporarily paused
    'completed',    -- Project has been successfully completed
    'cancelled'     -- Project has been cancelled
);

-- Create assignment_type enum
CREATE TYPE assignment_type AS ENUM (
    'full_time',    -- Full-time assignment (40 hours/week)
    'part_time',    -- Part-time assignment (less than 40 hours/week)
    'contractor',   -- External contractor assignment
    'consultant'    -- External consultant assignment
);

-- Create priority_level enum
CREATE TYPE priority_level AS ENUM (
    'low',          -- Low priority
    'medium',       -- Medium priority  
    'high',         -- High priority
    'critical'      -- Critical priority
);

-- Add comment for documentation
COMMENT ON TYPE project_status IS 'Status values for project lifecycle management';
COMMENT ON TYPE assignment_type IS 'Types of resource assignments to projects';
COMMENT ON TYPE priority_level IS 'Priority levels for projects and tasks';
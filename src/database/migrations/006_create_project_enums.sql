-- Migration: Create Project Management Enums
-- Created: 2025-09-06
-- Purpose: Create enums for project-resource integration system

-- Project status enumeration
CREATE TYPE project_status AS ENUM (
    'planning',     -- Initial project planning phase
    'active',       -- Project is actively being worked on
    'on-hold',      -- Project temporarily paused
    'completed',    -- Project successfully completed
    'cancelled'     -- Project terminated
);

-- Project priority enumeration  
CREATE TYPE project_priority AS ENUM (
    'low',          -- Low priority project
    'medium',       -- Standard priority project
    'high',         -- High priority project
    'critical'      -- Critical priority project
);

-- Assignment type enumeration
CREATE TYPE assignment_type AS ENUM (
    'employee',     -- Full-time employee
    'contractor',   -- External contractor
    'consultant',   -- External consultant
    'intern'        -- Intern or temporary worker
);

-- Assignment status enumeration
CREATE TYPE assignment_status AS ENUM (
    'planned',      -- Assignment planned but not started
    'active',       -- Assignment currently active
    'completed',    -- Assignment completed
    'cancelled',    -- Assignment cancelled
    'paused'        -- Assignment temporarily paused
);

-- Confidence level for assignments
CREATE TYPE confidence_level AS ENUM (
    'tentative',    -- Tentative assignment, may change
    'probable',     -- Likely assignment, some confidence
    'confirmed'     -- Confirmed assignment, high confidence
);

-- Resource conflict status
CREATE TYPE conflict_status AS ENUM (
    'detected',     -- Conflict detected by system
    'acknowledged', -- Conflict acknowledged by manager
    'resolved',     -- Conflict resolved
    'ignored'       -- Conflict marked as acceptable
);

-- Add comments for documentation
COMMENT ON TYPE project_status IS 'Status of project lifecycle from planning to completion';
COMMENT ON TYPE project_priority IS 'Business priority level for project prioritization';
COMMENT ON TYPE assignment_type IS 'Type of resource assignment (employee, contractor, etc.)';
COMMENT ON TYPE assignment_status IS 'Current status of resource assignment';
COMMENT ON TYPE confidence_level IS 'Confidence level for resource assignment planning';
COMMENT ON TYPE conflict_status IS 'Status of resource allocation conflicts';
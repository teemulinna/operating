-- Migration: Add is_active column to projects table
-- Created: 2025-09-09
-- Purpose: Fix database schema mismatch - add missing is_active column to projects table
-- This fixes the "column is_active does not exist" error in resource allocation creation

BEGIN;

-- Add is_active column to projects table if it doesn't exist
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update any existing projects to be active by default
UPDATE projects 
SET is_active = true 
WHERE is_active IS NULL;

-- Add index for performance on is_active column
CREATE INDEX IF NOT EXISTS idx_projects_is_active ON projects(is_active);

-- Add constraint to ensure is_active is not null
ALTER TABLE projects 
ALTER COLUMN is_active SET NOT NULL;

COMMIT;
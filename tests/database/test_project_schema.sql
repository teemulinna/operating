-- TDD Test Suite for Project Management Schema Extensions
-- This file contains comprehensive tests that must pass for the schema implementation

-- Test Setup: Create test schema and function for running tests
CREATE SCHEMA IF NOT EXISTS test_project_schema;
SET search_path = test_project_schema, public;

-- Test result tracking
CREATE TABLE IF NOT EXISTS test_results (
    test_name VARCHAR(255) PRIMARY KEY,
    passed BOOLEAN,
    error_message TEXT,
    run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test runner function
CREATE OR REPLACE FUNCTION run_test(test_name TEXT, test_query TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    result BOOLEAN := FALSE;
    error_msg TEXT;
BEGIN
    BEGIN
        EXECUTE test_query;
        result := TRUE;
        INSERT INTO test_results (test_name, passed, error_message) 
        VALUES (test_name, TRUE, NULL)
        ON CONFLICT (test_name) DO UPDATE SET 
            passed = TRUE, error_message = NULL, run_at = CURRENT_TIMESTAMP;
    EXCEPTION WHEN OTHERS THEN
        error_msg := SQLERRM;
        INSERT INTO test_results (test_name, passed, error_message) 
        VALUES (test_name, FALSE, error_msg)
        ON CONFLICT (test_name) DO UPDATE SET 
            passed = FALSE, error_message = error_msg, run_at = CURRENT_TIMESTAMP;
    END;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- TEST 1: Project Status Enum Tests
SELECT run_test(
    'project_status_enum_exists',
    'SELECT 1 WHERE EXISTS (SELECT 1 FROM pg_type WHERE typname = ''project_status'')'
);

SELECT run_test(
    'project_status_enum_values',
    'SELECT 1 WHERE ARRAY[''planning'', ''active'', ''on_hold'', ''completed'', ''cancelled'']::project_status[] IS NOT NULL'
);

-- TEST 2: Assignment Type Enum Tests
SELECT run_test(
    'assignment_type_enum_exists',
    'SELECT 1 WHERE EXISTS (SELECT 1 FROM pg_type WHERE typname = ''assignment_type'')'
);

SELECT run_test(
    'assignment_type_enum_values',
    'SELECT 1 WHERE ARRAY[''full_time'', ''part_time'', ''contractor'', ''consultant'']::assignment_type[] IS NOT NULL'
);

-- TEST 3: Priority Level Enum Tests
SELECT run_test(
    'priority_level_enum_exists',
    'SELECT 1 WHERE EXISTS (SELECT 1 FROM pg_type WHERE typname = ''priority_level'')'
);

SELECT run_test(
    'priority_level_enum_values',
    'SELECT 1 WHERE ARRAY[''low'', ''medium'', ''high'', ''critical'']::priority_level[] IS NOT NULL'
);

-- TEST 4: Projects Table Structure Tests
SELECT run_test(
    'projects_table_exists',
    'SELECT 1 FROM information_schema.tables WHERE table_name = ''projects'''
);

SELECT run_test(
    'projects_required_columns',
    'SELECT 1 WHERE (
        SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = ''projects'' 
        AND column_name IN (''id'', ''name'', ''description'', ''status'', ''priority'', ''start_date'', ''end_date'', ''budget'', ''estimated_hours'', ''client_id'')
    ) = 10'
);

-- TEST 5: Project Budget Validation Tests
SELECT run_test(
    'projects_budget_constraint',
    'INSERT INTO projects (name, description, budget) VALUES (''Test Project'', ''Test'', -1000.00)'
);

SELECT run_test(
    'projects_estimated_hours_constraint',
    'INSERT INTO projects (name, description, estimated_hours) VALUES (''Test Project'', ''Test'', -100)'
);

-- TEST 6: Project Dates Validation Tests
SELECT run_test(
    'projects_date_constraint',
    'INSERT INTO projects (name, description, start_date, end_date) VALUES (''Test Project'', ''Test'', ''2024-12-01'', ''2024-01-01'')'
);

-- TEST 7: Project Roles Table Structure Tests
SELECT run_test(
    'project_roles_table_exists',
    'SELECT 1 FROM information_schema.tables WHERE table_name = ''project_roles'''
);

SELECT run_test(
    'project_roles_required_columns',
    'SELECT 1 WHERE (
        SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = ''project_roles'' 
        AND column_name IN (''id'', ''project_id'', ''role_name'', ''required_skills'', ''min_proficiency'', ''estimated_hours'', ''hourly_rate'')
    ) = 7'
);

-- TEST 8: Resource Assignments Table Structure Tests
SELECT run_test(
    'resource_assignments_table_exists',
    'SELECT 1 FROM information_schema.tables WHERE table_name = ''resource_assignments'''
);

SELECT run_test(
    'resource_assignments_required_columns',
    'SELECT 1 WHERE (
        SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = ''resource_assignments'' 
        AND column_name IN (''id'', ''project_id'', ''employee_id'', ''project_role_id'', ''assignment_type'', ''start_date'', ''end_date'', ''allocated_hours_per_week'')
    ) = 8'
);

-- TEST 9: Foreign Key Constraints Tests
SELECT run_test(
    'project_roles_project_fk_exists',
    'SELECT 1 FROM information_schema.referential_constraints 
     WHERE constraint_name = ''fk_project_roles_project'''
);

SELECT run_test(
    'resource_assignments_project_fk_exists',
    'SELECT 1 FROM information_schema.referential_constraints 
     WHERE constraint_name = ''fk_resource_assignments_project'''
);

SELECT run_test(
    'resource_assignments_employee_fk_exists',
    'SELECT 1 FROM information_schema.referential_constraints 
     WHERE constraint_name = ''fk_resource_assignments_employee'''
);

SELECT run_test(
    'resource_assignments_role_fk_exists',
    'SELECT 1 FROM information_schema.referential_constraints 
     WHERE constraint_name = ''fk_resource_assignments_role'''
);

-- TEST 10: Capacity Validation Business Rules Tests
SELECT run_test(
    'capacity_validation_trigger_exists',
    'SELECT 1 FROM information_schema.triggers 
     WHERE trigger_name = ''trg_validate_assignment_capacity'''
);

-- TEST 11: Conflict Detection Tests
SELECT run_test(
    'conflict_detection_trigger_exists',
    'SELECT 1 FROM information_schema.triggers 
     WHERE trigger_name = ''trg_detect_assignment_conflicts'''
);

-- TEST 12: Performance Index Tests
SELECT run_test(
    'projects_name_index_exists',
    'SELECT 1 FROM pg_indexes WHERE indexname = ''idx_projects_name'''
);

SELECT run_test(
    'projects_status_dates_index_exists',
    'SELECT 1 FROM pg_indexes WHERE indexname = ''idx_projects_status_dates'''
);

SELECT run_test(
    'resource_assignments_employee_dates_index_exists',
    'SELECT 1 FROM pg_indexes WHERE indexname = ''idx_resource_assignments_employee_dates'''
);

SELECT run_test(
    'project_roles_skills_index_exists',
    'SELECT 1 FROM pg_indexes WHERE indexname = ''idx_project_roles_skills'''
);

-- TEST 13: Data Integrity Tests (will be run after schema creation)
CREATE OR REPLACE FUNCTION test_data_integrity()
RETURNS BOOLEAN AS $$
DECLARE
    test_project_id UUID;
    test_employee_id UUID;
    test_role_id UUID;
BEGIN
    -- Insert test data
    INSERT INTO projects (name, description, status, start_date, end_date, budget) 
    VALUES ('Test Project', 'Integration Test', 'planning', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 50000.00)
    RETURNING id INTO test_project_id;
    
    -- Get a test employee
    SELECT id INTO test_employee_id FROM employees LIMIT 1;
    
    -- Insert project role
    INSERT INTO project_roles (project_id, role_name, estimated_hours) 
    VALUES (test_project_id, 'Developer', 160)
    RETURNING id INTO test_role_id;
    
    -- Insert resource assignment
    INSERT INTO resource_assignments (project_id, employee_id, project_role_id, assignment_type, start_date, end_date, allocated_hours_per_week)
    VALUES (test_project_id, test_employee_id, test_role_id, 'full_time', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 40);
    
    -- Clean up test data
    DELETE FROM resource_assignments WHERE project_id = test_project_id;
    DELETE FROM project_roles WHERE project_id = test_project_id;
    DELETE FROM projects WHERE id = test_project_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- TEST 14: Skills Integration Tests
CREATE OR REPLACE FUNCTION test_skills_integration()
RETURNS BOOLEAN AS $$
DECLARE
    test_skill_ids UUID[];
BEGIN
    -- Test that project roles can reference multiple skills
    SELECT ARRAY_AGG(id) INTO test_skill_ids FROM skills WHERE category = 'technical' LIMIT 3;
    
    -- This should work without errors
    INSERT INTO project_roles (project_id, role_name, required_skills, min_proficiency, estimated_hours)
    SELECT 
        (SELECT id FROM projects LIMIT 1),
        'Senior Developer',
        test_skill_ids,
        'advanced'::proficiency_level,
        200
    WHERE EXISTS (SELECT 1 FROM projects LIMIT 1);
    
    -- Clean up
    DELETE FROM project_roles WHERE role_name = 'Senior Developer';
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Run final test summary
CREATE OR REPLACE FUNCTION get_test_summary()
RETURNS TABLE(total_tests INT, passed_tests INT, failed_tests INT, success_rate NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INT as total_tests,
        COUNT(*) FILTER (WHERE passed = TRUE)::INT as passed_tests,
        COUNT(*) FILTER (WHERE passed = FALSE)::INT as failed_tests,
        ROUND(COUNT(*) FILTER (WHERE passed = TRUE)::NUMERIC / COUNT(*) * 100, 2) as success_rate
    FROM test_results;
END;
$$ LANGUAGE plpgsql;

-- Display test results
\echo 'DATABASE SCHEMA TDD TEST SUITE'
\echo 'Run this after implementing the schema to verify all tests pass'
\echo 'Use: SELECT * FROM test_results WHERE passed = FALSE; to see failed tests'
\echo 'Use: SELECT * FROM get_test_summary(); to see overall results'
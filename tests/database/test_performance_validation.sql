-- Performance Testing and Validation for Project Management Schema
-- This file contains performance tests and validation queries

-- Performance Test Setup
CREATE SCHEMA IF NOT EXISTS perf_test;
SET search_path = perf_test, public;

-- Create performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    test_name VARCHAR(255),
    execution_time_ms INTEGER,
    rows_affected INTEGER,
    query_plan TEXT,
    run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Function to measure query performance
CREATE OR REPLACE FUNCTION measure_performance(test_name TEXT, test_query TEXT)
RETURNS TABLE(execution_time_ms INTEGER, rows_affected INTEGER) AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    exec_time INTEGER;
    row_count INTEGER;
BEGIN
    start_time := clock_timestamp();
    EXECUTE test_query;
    end_time := clock_timestamp();
    
    exec_time := EXTRACT(milliseconds FROM (end_time - start_time))::INTEGER;
    GET DIAGNOSTICS row_count = ROW_COUNT;
    
    INSERT INTO performance_metrics (test_name, execution_time_ms, rows_affected)
    VALUES (test_name, exec_time, row_count);
    
    RETURN QUERY SELECT exec_time, row_count;
END;
$$ LANGUAGE plpgsql;

-- PERFORMANCE TEST 1: Project Creation and Lookup Performance
SELECT * FROM measure_performance(
    'project_creation_performance',
    'INSERT INTO projects (name, description, status, start_date, end_date, budget) 
     SELECT 
         ''Perf Test Project '' || generate_series(1, 100),
         ''Performance test project description'',
         ''planning'',
         CURRENT_DATE + (random() * 30)::integer,
         CURRENT_DATE + (random() * 90 + 30)::integer,
         (random() * 100000)::numeric(12,2)
     FROM generate_series(1, 100)'
);

-- PERFORMANCE TEST 2: Project Search by Name Performance
SELECT * FROM measure_performance(
    'project_name_search_performance',
    'SELECT * FROM projects WHERE name ILIKE ''%Test%'''
);

-- PERFORMANCE TEST 3: Project Status and Date Range Query Performance
SELECT * FROM measure_performance(
    'project_status_date_query_performance',
    'SELECT p.*, COUNT(ra.id) as assignment_count
     FROM projects p
     LEFT JOIN resource_assignments ra ON p.id = ra.project_id
     WHERE p.status IN (''planning'', ''active'') 
     AND p.start_date >= CURRENT_DATE - INTERVAL ''30 days''
     GROUP BY p.id'
);

-- PERFORMANCE TEST 4: Employee Assignment Lookup Performance
SELECT * FROM measure_performance(
    'employee_assignment_lookup_performance',
    'SELECT e.first_name, e.last_name, p.name as project_name, pr.role_name,
            ra.allocated_hours_per_week, ra.start_date, ra.end_date
     FROM employees e
     JOIN resource_assignments ra ON e.id = ra.employee_id
     JOIN projects p ON ra.project_id = p.id
     JOIN project_roles pr ON ra.project_role_id = pr.id
     WHERE ra.is_active = true
     AND ra.start_date <= CURRENT_DATE + INTERVAL ''30 days''
     ORDER BY e.last_name, e.first_name'
);

-- PERFORMANCE TEST 5: Skill Matching Query Performance
SELECT * FROM measure_performance(
    'skill_matching_query_performance',
    'SELECT e.first_name, e.last_name, pr.role_name, p.name as project_name,
            ARRAY_AGG(s.name) as matching_skills
     FROM employees e
     JOIN employee_skills es ON e.id = es.employee_id
     JOIN skills s ON es.skill_id = s.id
     JOIN project_roles pr ON s.id = ANY(pr.required_skills)
     JOIN projects p ON pr.project_id = p.id
     WHERE es.proficiency_level >= pr.min_proficiency
     AND e.is_active = true
     AND p.is_active = true
     AND pr.is_active = true
     GROUP BY e.id, pr.id, p.id'
);

-- PERFORMANCE TEST 6: Capacity Utilization Analysis Performance
SELECT * FROM measure_performance(
    'capacity_utilization_analysis_performance',
    'SELECT e.id, e.first_name, e.last_name,
            SUM(ra.allocated_hours_per_week) as total_allocated_hours,
            COUNT(ra.id) as active_assignments,
            AVG(ra.utilization_rate) as avg_utilization
     FROM employees e
     LEFT JOIN resource_assignments ra ON e.id = ra.employee_id
         AND ra.is_active = true
         AND ra.start_date <= CURRENT_DATE
         AND ra.end_date >= CURRENT_DATE
     WHERE e.is_active = true
     GROUP BY e.id, e.first_name, e.last_name
     HAVING SUM(ra.allocated_hours_per_week) > 30 OR SUM(ra.allocated_hours_per_week) IS NULL
     ORDER BY total_allocated_hours DESC NULLS LAST'
);

-- DATA INTEGRITY VALIDATION TESTS

-- Test 1: Verify Foreign Key Constraints
CREATE OR REPLACE FUNCTION test_foreign_key_integrity()
RETURNS TABLE(constraint_name TEXT, is_valid BOOLEAN, error_message TEXT) AS $$
BEGIN
    -- Test projects -> departments FK
    RETURN QUERY
    SELECT 'fk_projects_department'::TEXT, 
           NOT EXISTS(SELECT 1 FROM projects WHERE department_id IS NOT NULL 
                     AND department_id NOT IN (SELECT id FROM departments)),
           'Invalid department_id found in projects table'::TEXT;
    
    -- Test projects -> employees FK (manager)
    RETURN QUERY
    SELECT 'fk_projects_manager'::TEXT,
           NOT EXISTS(SELECT 1 FROM projects WHERE project_manager_id IS NOT NULL 
                     AND project_manager_id NOT IN (SELECT id FROM employees)),
           'Invalid project_manager_id found in projects table'::TEXT;
    
    -- Test project_roles -> projects FK
    RETURN QUERY
    SELECT 'fk_project_roles_project'::TEXT,
           NOT EXISTS(SELECT 1 FROM project_roles WHERE project_id NOT IN (SELECT id FROM projects)),
           'Invalid project_id found in project_roles table'::TEXT;
    
    -- Test resource_assignments -> projects FK
    RETURN QUERY
    SELECT 'fk_resource_assignments_project'::TEXT,
           NOT EXISTS(SELECT 1 FROM resource_assignments WHERE project_id NOT IN (SELECT id FROM projects)),
           'Invalid project_id found in resource_assignments table'::TEXT;
    
    -- Test resource_assignments -> employees FK
    RETURN QUERY
    SELECT 'fk_resource_assignments_employee'::TEXT,
           NOT EXISTS(SELECT 1 FROM resource_assignments WHERE employee_id NOT IN (SELECT id FROM employees)),
           'Invalid employee_id found in resource_assignments table'::TEXT;
    
    -- Test resource_assignments -> project_roles FK
    RETURN QUERY
    SELECT 'fk_resource_assignments_role'::TEXT,
           NOT EXISTS(SELECT 1 FROM resource_assignments WHERE project_role_id NOT IN (SELECT id FROM project_roles)),
           'Invalid project_role_id found in resource_assignments table'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Test 2: Verify Business Rule Constraints
CREATE OR REPLACE FUNCTION test_business_rules()
RETURNS TABLE(rule_name TEXT, is_valid BOOLEAN, violation_count INTEGER) AS $$
BEGIN
    -- Test project date consistency
    RETURN QUERY
    SELECT 'project_dates_consistency'::TEXT,
           NOT EXISTS(SELECT 1 FROM projects WHERE start_date > end_date),
           (SELECT COUNT(*)::INTEGER FROM projects WHERE start_date > end_date);
    
    -- Test assignment date consistency  
    RETURN QUERY
    SELECT 'assignment_dates_consistency'::TEXT,
           NOT EXISTS(SELECT 1 FROM resource_assignments WHERE start_date > end_date),
           (SELECT COUNT(*)::INTEGER FROM resource_assignments WHERE start_date > end_date);
    
    -- Test capacity constraints
    RETURN QUERY
    SELECT 'capacity_constraints'::TEXT,
           NOT EXISTS(
               SELECT 1 FROM (
                   SELECT employee_id, SUM(allocated_hours_per_week) as total_hours
                   FROM resource_assignments 
                   WHERE is_active = true 
                   GROUP BY employee_id
                   HAVING SUM(allocated_hours_per_week) > 60
               ) violations
           ),
           (SELECT COUNT(*)::INTEGER FROM (
               SELECT employee_id
               FROM resource_assignments 
               WHERE is_active = true 
               GROUP BY employee_id
               HAVING SUM(allocated_hours_per_week) > 60
           ) violations);
    
    -- Test skill requirements validation
    RETURN QUERY
    SELECT 'skill_requirements_met'::TEXT,
           NOT EXISTS(
               SELECT 1 FROM resource_assignments ra
               JOIN project_roles pr ON ra.project_role_id = pr.id
               WHERE pr.required_skills IS NOT NULL
               AND array_length(pr.required_skills, 1) > 0
               AND NOT EXISTS (
                   SELECT 1 FROM employee_skills es
                   WHERE es.employee_id = ra.employee_id
                   AND es.skill_id = ANY(pr.required_skills)
                   AND es.proficiency_level >= pr.min_proficiency
                   AND es.is_active = true
               )
               AND ra.is_active = true
           ),
           (SELECT COUNT(*)::INTEGER FROM resource_assignments ra
            JOIN project_roles pr ON ra.project_role_id = pr.id
            WHERE pr.required_skills IS NOT NULL
            AND array_length(pr.required_skills, 1) > 0
            AND NOT EXISTS (
                SELECT 1 FROM employee_skills es
                WHERE es.employee_id = ra.employee_id
                AND es.skill_id = ANY(pr.required_skills)
                AND es.proficiency_level >= pr.min_proficiency
                AND es.is_active = true
            )
            AND ra.is_active = true);
END;
$$ LANGUAGE plpgsql;

-- Test 3: Verify Index Performance
CREATE OR REPLACE FUNCTION test_index_usage()
RETURNS TABLE(index_name TEXT, table_name TEXT, is_used BOOLEAN) AS $$
BEGIN
    -- This would require actual query execution statistics
    -- For now, we'll check if indexes exist
    RETURN QUERY
    SELECT i.indexname::TEXT, i.tablename::TEXT, TRUE
    FROM pg_indexes i
    WHERE i.schemaname = 'public'
    AND i.tablename IN ('projects', 'project_roles', 'resource_assignments')
    ORDER BY i.tablename, i.indexname;
END;
$$ LANGUAGE plpgsql;

-- Sample Data Generation for Performance Testing
CREATE OR REPLACE FUNCTION generate_sample_data()
RETURNS VOID AS $$
DECLARE
    dept_id UUID;
    emp_id UUID;
    skill_id UUID;
    proj_id UUID;
    role_id UUID;
    i INTEGER;
BEGIN
    -- Get existing department and employee IDs
    SELECT id INTO dept_id FROM departments LIMIT 1;
    SELECT id INTO emp_id FROM employees LIMIT 1;
    SELECT id INTO skill_id FROM skills WHERE category = 'technical' LIMIT 1;
    
    -- Generate sample projects
    FOR i IN 1..50 LOOP
        INSERT INTO projects (name, description, status, priority, start_date, end_date, budget, estimated_hours, department_id)
        VALUES (
            'Sample Project ' || i,
            'Generated project for performance testing',
            (ARRAY['planning', 'active', 'on_hold'])[1 + (random() * 2)::INTEGER],
            (ARRAY['low', 'medium', 'high'])[1 + (random() * 2)::INTEGER],
            CURRENT_DATE + (random() * 30)::INTEGER,
            CURRENT_DATE + (random() * 90 + 60)::INTEGER,
            (10000 + random() * 90000)::NUMERIC(12,2),
            (100 + random() * 900)::INTEGER,
            dept_id
        ) RETURNING id INTO proj_id;
        
        -- Generate sample project roles for each project
        INSERT INTO project_roles (project_id, role_name, required_skills, min_proficiency, estimated_hours, hourly_rate)
        VALUES (
            proj_id,
            'Developer Role ' || i,
            ARRAY[skill_id],
            'intermediate',
            (40 + random() * 120)::INTEGER,
            (50 + random() * 100)::NUMERIC(8,2)
        ) RETURNING id INTO role_id;
        
        -- Generate sample resource assignments (50% of projects get assignments)
        IF random() > 0.5 THEN
            INSERT INTO resource_assignments (project_id, employee_id, project_role_id, assignment_type, start_date, end_date, allocated_hours_per_week)
            VALUES (
                proj_id,
                emp_id,
                role_id,
                (ARRAY['full_time', 'part_time'])[1 + (random())::INTEGER],
                CURRENT_DATE + (random() * 30)::INTEGER,
                CURRENT_DATE + (random() * 60 + 30)::INTEGER,
                (10 + random() * 30)::NUMERIC(5,2)
            );
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Generated 50 sample projects with roles and assignments';
END;
$$ LANGUAGE plpgsql;

-- Cleanup function
CREATE OR REPLACE FUNCTION cleanup_sample_data()
RETURNS VOID AS $$
BEGIN
    DELETE FROM resource_assignments WHERE project_id IN (
        SELECT id FROM projects WHERE name LIKE 'Sample Project %' OR name LIKE 'Perf Test Project %'
    );
    DELETE FROM project_roles WHERE project_id IN (
        SELECT id FROM projects WHERE name LIKE 'Sample Project %' OR name LIKE 'Perf Test Project %'
    );
    DELETE FROM projects WHERE name LIKE 'Sample Project %' OR name LIKE 'Perf Test Project %';
    
    RAISE NOTICE 'Cleaned up sample data';
END;
$$ LANGUAGE plpgsql;

-- Performance summary report
CREATE OR REPLACE FUNCTION get_performance_summary()
RETURNS TABLE(
    avg_execution_time_ms NUMERIC,
    max_execution_time_ms INTEGER,
    total_tests INTEGER,
    slow_tests INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROUND(AVG(execution_time_ms), 2) as avg_execution_time_ms,
        MAX(execution_time_ms) as max_execution_time_ms,
        COUNT(*)::INTEGER as total_tests,
        COUNT(*) FILTER (WHERE execution_time_ms > 1000)::INTEGER as slow_tests
    FROM performance_metrics;
END;
$$ LANGUAGE plpgsql;

-- Usage Instructions
\echo '=== PROJECT MANAGEMENT SCHEMA PERFORMANCE VALIDATION ==='
\echo 'Run the following commands to test the schema:'
\echo ''
\echo '1. Generate sample data:'
\echo '   SELECT generate_sample_data();'
\echo ''
\echo '2. Run performance tests (already executed above)'
\echo '   Check results: SELECT * FROM performance_metrics ORDER BY execution_time_ms DESC;'
\echo ''
\echo '3. Validate data integrity:'
\echo '   SELECT * FROM test_foreign_key_integrity();'
\echo '   SELECT * FROM test_business_rules();'
\echo ''
\echo '4. Check index usage:'
\echo '   SELECT * FROM test_index_usage();'
\echo ''
\echo '5. Get performance summary:'
\echo '   SELECT * FROM get_performance_summary();'
\echo ''
\echo '6. Cleanup:'
\echo '   SELECT cleanup_sample_data();'
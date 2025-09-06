-- TDD Validation Runner for Project Management Schema
-- This script runs the complete validation suite and reports results

\echo '=== STARTING TDD VALIDATION FOR PROJECT MANAGEMENT SCHEMA ==='
\echo ''

-- First, run the schema tests
\echo '1. Running schema structure tests...'
\i tests/database/test_project_schema.sql

\echo ''
\echo '2. Schema test results:'
SELECT test_name, passed, error_message 
FROM test_project_schema.test_results 
ORDER BY test_name;

\echo ''
\echo '3. Test Summary:'
SELECT * FROM test_project_schema.get_test_summary();

\echo ''
\echo '4. Running performance validation...'
\i tests/database/test_performance_validation.sql

-- Run data integrity tests if we have existing data
\echo ''
\echo '5. Checking data integrity...'
SELECT * FROM perf_test.test_foreign_key_integrity();

\echo ''
\echo '6. Checking business rules...'
SELECT * FROM perf_test.test_business_rules();

\echo ''
\echo '7. Checking index usage...'
SELECT * FROM perf_test.test_index_usage();

\echo ''
\echo '=== TDD VALIDATION COMPLETE ==='
\echo 'All tests should pass for successful schema implementation'
\echo 'Check any failed tests and fix schema before proceeding'
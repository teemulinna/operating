# Project Management Schema Implementation

## Overview
This implements the database foundation for ResourceForge project-resource integration system using Test-Driven Development methodology. The schema extends the existing resource management system with comprehensive project management capabilities.

## Migration Files (Run in Order)

### 006_create_project_enums.sql
Creates core enums for project management:
- `project_status`: planning, active, on_hold, completed, cancelled
- `assignment_type`: full_time, part_time, contractor, consultant
- `priority_level`: low, medium, high, critical

### 007_create_projects_table.sql
Core projects table with:
- Project lifecycle management
- Budget and cost tracking with validation
- Date consistency validation
- Integration with departments and employees
- Comprehensive performance indexing
- Completion percentage tracking

### 008_create_project_roles_table.sql
Project roles with skills integration:
- Skills-based role definitions using existing skills system
- Proficiency level requirements
- Capacity planning with hour estimates and rates
- Skill validation triggers
- Role fill status tracking

### 009_create_resource_assignments_table.sql
Resource assignments with capacity tracking:
- Employee-to-role assignments
- Weekly hour allocation with constraints
- Automated capacity validation
- Assignment conflict detection
- Utilization rate calculation

## Key Features Implemented

### Business Rules
- **Capacity Validation**: Prevents over-allocation (max 60 hours/week)
- **Conflict Detection**: Warns about overlapping assignments
- **Skills Validation**: Ensures role requirements match employee skills
- **Date Consistency**: Enforces logical date relationships
- **Role Fill Status**: Auto-updates when assignments reach capacity

### Performance Optimizations
- Comprehensive indexing for common query patterns
- Partial indexes for active records and ongoing projects
- GIN indexes for skills array queries
- Compound indexes for date range and status queries

### Integration Points
- Seamless integration with existing resources, skills, departments tables
- Leverages existing proficiency_level and skill_category enums
- Maintains referential integrity with proper CASCADE behaviors
- Compatible with existing capacity_history tracking

## Testing Suite

### Test Files
- `tests/database/test_project_schema.sql`: TDD test suite
- `tests/database/test_performance_validation.sql`: Performance testing
- `tests/database/integration_validation.sql`: Integration testing
- `tests/database/run_tdd_validation.sql`: Complete validation runner

### Running Tests
```sql
-- Run complete validation suite
\i tests/database/run_tdd_validation.sql

-- Run integration tests
\i tests/database/integration_validation.sql
```

## Usage Examples

### Creating a Project
```sql
INSERT INTO projects (name, description, status, priority, start_date, end_date, budget, estimated_hours, department_id)
VALUES ('New Product Launch', 'Q1 2024 product launch project', 'planning', 'high', 
        '2024-01-01', '2024-03-31', 150000.00, 800, '<department_id>');
```

### Defining Project Role with Skills
```sql
INSERT INTO project_roles (project_id, role_name, required_skills, min_proficiency, estimated_hours, hourly_rate)
VALUES ('<project_id>', 'Senior React Developer', 
        ARRAY['<react_skill_id>', '<javascript_skill_id>'], 
        'advanced', 240, 95.00);
```

### Assigning Employee to Role
```sql
INSERT INTO resource_assignments (project_id, employee_id, project_role_id, assignment_type, 
                                 start_date, end_date, allocated_hours_per_week)
VALUES ('<project_id>', '<employee_id>', '<role_id>', 'full_time', 
        '2024-01-01', '2024-02-29', 40.0);
```

## Common Queries

### Project Status Dashboard
```sql
SELECT p.name, p.status, p.completion_percentage, 
       COUNT(ra.id) as assigned_resources,
       SUM(ra.allocated_hours_per_week) as total_weekly_hours
FROM projects p
LEFT JOIN resource_assignments ra ON p.id = ra.project_id AND ra.is_active = true
WHERE p.is_active = true
GROUP BY p.id, p.name, p.status, p.completion_percentage
ORDER BY p.priority DESC, p.start_date;
```

### Employee Workload Analysis
```sql
SELECT e.first_name, e.last_name,
       SUM(ra.allocated_hours_per_week) as total_allocated_hours,
       COUNT(ra.id) as active_projects,
       AVG(ra.utilization_rate) as avg_utilization
FROM employees e
JOIN resource_assignments ra ON e.id = ra.employee_id
WHERE ra.is_active = true 
AND ra.start_date <= CURRENT_DATE 
AND ra.end_date >= CURRENT_DATE
GROUP BY e.id, e.first_name, e.last_name
ORDER BY total_allocated_hours DESC;
```

### Skills Gap Analysis
```sql
SELECT pr.role_name, p.name as project_name,
       ARRAY_TO_STRING((SELECT ARRAY_AGG(s.name) FROM skills s WHERE s.id = ANY(pr.required_skills)), ', ') as required_skills,
       pr.min_proficiency,
       CASE WHEN ra.id IS NULL THEN 'UNFILLED' ELSE 'FILLED' END as status
FROM project_roles pr
JOIN projects p ON pr.project_id = p.id
LEFT JOIN resource_assignments ra ON pr.id = ra.project_role_id AND ra.is_active = true
WHERE pr.is_active = true AND p.status IN ('planning', 'active')
ORDER BY p.priority DESC, pr.role_name;
```

## Maintenance

### Regular Maintenance Tasks
1. **Update Utilization Rates**: Run weekly to update actual hours logged
2. **Archive Completed Projects**: Move completed projects to archive tables
3. **Capacity Planning Reviews**: Monthly review of resource allocation
4. **Skills Gap Analysis**: Quarterly analysis of unfilled roles

### Performance Monitoring
- Monitor slow queries using the performance test suite
- Review index usage with `test_index_usage()` function
- Track capacity validation trigger performance

## Support for API/Frontend Teams

The schema provides a solid foundation for:
- **RESTful API endpoints** with optimized queries
- **Real-time capacity tracking** for resource planning
- **Skills-based matching** for automatic role assignments
- **Project analytics** and reporting capabilities
- **Conflict detection** for booking systems

All business logic is implemented at the database level with comprehensive validation, allowing API layers to focus on presentation and user experience rather than complex validation rules.
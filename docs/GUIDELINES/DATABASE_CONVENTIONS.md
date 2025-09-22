## Database Conventions (PostgreSQL)

### Standards
- UUID primary keys via `gen_random_uuid()` (pgcrypto); enable extension at bootstrap
- snake_case for tables/columns; plural table names
- Timestamps with time zone where applicable (`created_at`, `updated_at`)

### Enums & Types
- Create enums before referencing columns
- Names: `allocation_status`, `warning_severity`, `allocation_warning_type`

### Constraints & Indexes
- NOT NULL where possible; CHECK constraints for ranges (hours, percentages)
- Foreign keys with explicit `ON DELETE` (CASCADE for dependent snapshots)
- Index common filters: `(employee_id, start_date, end_date)`, `(project_id, is_active)`
- Partial indexes for frequent predicates (e.g., unresolved warnings)
- INCLUDE covering fields for dashboards

### Views & Materialized Views
- Views for daily/weekly heatmaps; materialize heavy aggregations
- Refresh with `CONCURRENTLY` on schedules; isolate to off-peak

### Migrations
- Order: 1) enums/types 2) tables 3) constraints/indexes 4) backfills 5) views
- Provide down scripts; test in staging; use `CONCURRENTLY` for prod indexes

### Naming Examples
- Tables: `employee_capacity_snapshots`, `over_allocation_warnings`, `resource_allocations`
- Columns: `start_date`, `end_date`, `daily_capacity_hours`, `allocation_status`

### Performance
- Avoid cross-join expansions; careful with `generate_series`
- Use EXPLAIN ANALYZE before merging heavy queries



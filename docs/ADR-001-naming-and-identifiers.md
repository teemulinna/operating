# ADR-001: Naming and Identifiers

## Status
Accepted

## Context
The project had inconsistencies across documentation and sample SQL regarding:
- Table naming for allocations (`resource_assignments` vs `resource_allocations`)
- UUID generation function (`uuid_generate_v4()` vs `gen_random_uuid()`)
- Canonical capacity field naming (`weekly_capacity`, `weekly_hours`, `daily_capacity_hours`)

## Decision
- Use `resource_allocations` as the canonical table name across DB, code, and docs.
- Use `gen_random_uuid()` from `pgcrypto` for UUID generation.
- Use `weekly_capacity` on `employees` as the canonical capacity field. Derive daily capacity in views/functions as `weekly_capacity / 5.0`.

## Consequences
- Update all docs and migrations to replace `resource_assignments` with `resource_allocations`.
- Ensure `pgcrypto` extension is enabled during bootstrap/migrations; avoid dependency on `uuid-ossp`.
- Avoid adding `daily_capacity_hours` as a persisted column; where present, treat as legacy/derived and plan deprecation. Use derived daily capacity consistently in analytical views and calculations.

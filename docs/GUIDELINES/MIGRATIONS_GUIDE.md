## Migrations Guide

### Principles
- Ordered, idempotent, reversible when feasible
- Separate enum/type creation from table changes
- Never reference an enum before it exists

### Standard Order
1) Create enums/types
2) Create/alter tables
3) Add indexes/constraints
4) Backfill data (safe batches)
5) Views/materialized views

### UUID Standard
- Use `gen_random_uuid()`; ensure `pgcrypto` enabled in bootstrap

### Rollback
- Provide `down` scripts; for materialized views, drop before dependent views

### Performance
- Use `CONCURRENTLY` for indexes in production
- Avoid locks during peak hours; schedule long-running operations

### Verification
- Dry run in staging; run application smoke tests after migrating



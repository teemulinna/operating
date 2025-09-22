# ADR-003: Phase 1 Scope and Performance Decisions

## Status
Accepted

## Context
Phase 1 documents occasionally expanded scope with Redis caching and GraphQL suggestions, while the plan emphasized lean delivery: HTTP caching + React Query and REST-only. TimescaleDB decision criteria were not formalized.

## Decision
- API Style: REST-only for Phase 1. Defer GraphQL; re-evaluate post Phase 1.
- Caching: Start with HTTP cache headers and client caching (React Query). Redis is optional and must be behind a feature flag; not required for Phase 1.
- TimescaleDB: Defer unless criteria are met.
  - Adopt if any of the following apply by end of Phase 1 pilot:
    - `capacity_history` exceeds 50M rows with p95 heatmap queries > 2s under load
    - View refresh cadences < 5m cannot be met with standard indexes/materialized views
    - Forecasting/predictive workloads require hypertables for retention/rollups

Operational details:
- Heatmap endpoints set Cache-Control: public, max-age=300, stale-while-revalidate=60 (department/weekly), and private, max-age=120 for employee-specific.
- Materialize `daily_capacity_heatmap` and refresh on a controlled cadence (CRON or post-commit hook if needed).

## Consequences
- Keeps Phase 1 delivery focused, reduces infra complexity.
- Clear adoption criteria for Timescale; avoids premature optimization.
- Consistent cache behavior documented for FE/BE and tests.

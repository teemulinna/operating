# Resource Management Platform — Phase 1 + Post‑MVP Development Plan

## Overview
Based on `POST-MVP-PRD.md` (Heat Maps, Predictive Analytics, What‑If Scenarios, Skill Matching, Time Tracking, Engagement Requests, Financial Intelligence, Advanced Availability, Collaboration, Intelligent Notifications) and the Phase 1 docs, the system is ~85% infra‑ready. This plan aligns all deliverables, surfaces inconsistencies, and provides concrete tasks to get to a production‑ready release.

## 1. Project Setup
- [ ] Repository and branching model
  - GitFlow with protected `main`; feature branches with required reviews
  - Conventional Commits; semantic-release
- [ ] Development environment and tooling
  - Node/TS versions; pnpm/npm lockfile standardization
  - Linting/formatting: ESLint + Prettier + `tsc --noEmit` in CI
  - Commit hooks: Husky + lint-staged
- [ ] Database setup
  - [ ] Decide UUID extension and standardize: `uuid-ossp` vs `pgcrypto` (`gen_random_uuid()` vs `uuid_generate_v4()`)
  - [ ] Enable required extensions: `btree_gin`, `pg_trgm`; optionally TimescaleDB (per PRD recommendation)
  - [ ] Migrations framework consistency and ordering conventions
- [ ] Configuration and secrets
  - `.env` per env (dev/staging/prod); 12‑factor config; secret manager integration
- [ ] CI/CD
  - Unit, integration, E2E, lint/typecheck, build artifacts
  - DB migration apply/rollback steps; seeded staging data
- [ ] Observability foundations
  - Structured logging; tracing hooks; metrics baseline (Prometheus/OpenTelemetry)
- [ ] Documentation scaffolding
  - ADRs; API docs (OpenAPI); Architecture diagrams in `/docs/`
- [ ] Feature flags
  - Flags for `HEATMAP`, `AVAILABILITY`, `SCENARIOS` (and others from PRD)

## 2. Backend Foundation
- [ ] Domain model and naming consistency
  - Canonical tables: standardize on `resource_allocations` (not `resource_assignments`)
  - Canonical capacity fields: choose `weekly_capacity` and derive `daily_capacity_hours` deterministically, or adopt one consistently across code/docs
- [ ] Base API structure
  - Module layout: controllers/services/repos/types/schemas
  - Request validation: Zod or class‑validator (one standard)
- [ ] Authentication/Authorization
  - JWT/OAuth; RBAC for roles: resource_manager, project_manager, executive, employee, admin
  - Route guards + permission checks for approval workflows
- [ ] Core services/utilities
  - Date/time: UTC storage; TZ conversion at edges
  - WebSocket event bus (`capacity:updated`, `warning:*`)
  - Caching abstraction (memory + Redis optional)
- [ ] Database migrations hygiene
  - [ ] Ensure enum types are created BEFORE tables referencing them
  - [ ] Idempotent, reversible migrations; pre/post checks

## 3. Feature‑specific Backend
- [ ] Heat Maps (Phase 1)
  - [ ] Views/aggregations
    - Create/refresh `daily_capacity_heatmap`, `weekly_capacity_heatmap`, `department_capacity_summary` using `resource_allocations`
    - Verify performance indexes on date ranges, employee, department
  - [ ] Color thresholds standardization
    - One mapping across all docs: e.g., available/low/medium/high/overallocated or green/blue/yellow/red
  - [ ] Endpoints
    - `GET /api/capacity/heatmap` (filters: date range, granularity, dept/employee, levels)
    - `GET /api/capacity/trends/:employeeId`
    - `GET /api/capacity/bottlenecks`
  - [ ] Export service (CSV/PDF/PNG) and cache headers
  - [ ] Realtime events via WS on allocation/capacity changes
- [ ] Advanced Availability Management (Phase 1)
  - [ ] Tables
    - `availability_patterns` (JSONB config), `availability_exceptions`, `holiday_calendar`, `capacity_recalculation_log`
    - Indexes for employee/date/status; GIN on JSONB where applicable
  - [ ] Functions
    - `calculate_daily_capacity`, `recalculate_capacity_range`
  - [ ] Services/Endpoints
    - Create/update patterns; add exceptions; holiday mgmt; effective availability queries
  - [ ] Background jobs
    - Scheduled recalculation; holiday imports; audit logging
- [ ] What‑If Scenarios (Phase 1)
  - [ ] Tables
    - `planning_scenarios`, `scenario_allocations`, `scenario_impact_analysis`
  - [ ] Analysis functions
    - `analyze_scenario_capacity`, `compare_scenarios`
  - [ ] Services/Endpoints
    - CRUD scenarios; add allocations; run analysis; compare; apply scenario
  - [ ] Transaction‑based sandboxing with isolation and rollback
- [ ] Intelligent Notifications & Insights (PRD)
  - [ ] Rules engine for anomaly detection (initial heuristics)
  - [ ] Weekly insights generator; notification templates (email/Slack)
  - [ ] Endpoints to fetch insights; WS broadcasts
- [ ] Time Intelligence & Tracking (PRD)
  - [ ] Table `time_entries`, indexes, referential integrity
  - [ ] Service to sync entries to capacity and utilization views
  - [ ] Endpoints: CRUD entries; summaries per employee/project
- [ ] Resource Engagement Requests (PRD)
  - [ ] State machine for approvals (pending/approved/rejected)
  - [ ] Priority queue logic; conflict checks; notifications
  - [ ] Endpoints for request lifecycle and audit
- [ ] Financial Intelligence (PRD)
  - [ ] Tables `cost_rates`, `financial_forecasts`
  - [ ] Financial calc engine; endpoints for forecasts/margins
- [ ] Smart Skill Matching (PRD)
  - [ ] Matching strategy (non‑ML first: rule‑based + similarity)
  - [ ] Embedding pipeline (future); endpoints for suggestions
- [ ] Team Collaboration (PRD)
  - [ ] Tables for capacity offers/mentoring; matching routines
  - [ ] Endpoints and WS channels

## 4. Frontend Foundation
- [ ] Framework and libraries
  - React + TypeScript; Tailwind; icon set; charting (Recharts or D3) — decide and standardize
- [ ] State and data
  - Standardize on `@tanstack/react-query` (not `react-query`) throughout
  - Global store (Zustand) only for realtime UI state that spans queries
- [ ] Routing and layouts
  - Nested routes for capacity, availability, scenarios, warnings, admin
- [ ] Design system
  - Component primitives, theming, a11y (WCAG 2.1 AA), responsive
- [ ] Error handling
  - Error boundaries + typed error surfaces
- [ ] WebSocket client
  - Hook abstraction; auto‑reconnect; auth; backoff

## 5. Feature‑specific Frontend
- [ ] Heat Maps
  - [ ] Components: HeatMap container, grid (virtualized for scale), filters, legend, tooltip, summary KPIs
  - [ ] Interactions: drilldown modal to allocations; export (CSV/PDF/PNG)
  - [ ] Filters: date range, granularity, dept/team/employee, utilization level
  - [ ] Realtime updates via WS with cache updates
- [ ] Availability
  - [ ] Pattern Editor (weekly/biweekly/custom), Calendar view, Exceptions UI, Holiday integration
  - [ ] Validation (conflicts, max weekly hours, TZ display)
  - [ ] Save flows with optimistic updates + toasts
- [ ] Scenarios
  - [ ] Scenario workspace (MVP: forms; optional DnD later)
  - [ ] Impact analysis dashboard, comparison view
  - [ ] Apply/rollback flows; approval submit
- [ ] Warnings Dashboard
  - [ ] List, filters, acknowledge/resolve actions
  - [ ] Inline linking to impacted days/employees
- [ ] Time Tracking (PRD)
  - [ ] Time entry UI (manual first); sync indicators; suggestions placeholder
- [ ] Engagement Requests (PRD)
  - [ ] Request creation, priority, approval panel; conflict resolution UI
- [ ] Financial (PRD)
  - [ ] Cost rate management; forecast charts
- [ ] Collaboration (PRD)
  - [ ] Capacity offers, mentoring UI; notifications

## 6. Integration
- [ ] API integration contracts
  - OpenAPI alignment; strict typing for client SDK
- [ ] End‑to‑end data flows
  - Allocation -> capacity -> heatmap -> warnings -> notifications
  - Availability pattern -> recalculation -> capacity -> heatmap
  - Scenario allocations -> analysis -> comparison -> apply -> live allocations
- [ ] Feature flags gating and progressive rollout
- [ ] Backfill/migration plans for existing data
- [ ] Performance budgets and SLOs defined per route/view

## 7. Testing
- [ ] Unit tests
  - Services (capacity, availability, scenarios, warnings); utilities (date math)
- [ ] Integration tests
  - API routes and DB functions/views; transactions and rollbacks
- [ ] E2E tests (Playwright)
  - Heat map visualization and drilldown; availability workflows; scenario lifecycle; warnings flow
- [ ] Performance testing
  - P95 latency targets; heatmap queries under load; WS fan‑out
- [ ] Security testing
  - AuthZ on sensitive routes; approval bypass attempts; input validation fuzzing
- [ ] Migration tests
  - Up/down order; type dependencies; data integrity after rollbacks

## 8. Documentation
- [ ] API documentation (OpenAPI) with examples
- [ ] User guides
  - Heat maps; Availability patterns; Scenarios; Warnings; Exports
- [ ] Developer docs
  - Local setup; data model; event taxonomy; caching strategy
- [ ] System architecture
  - Updated diagrams; data flows; ADRs for major decisions (color thresholds, naming, UUID extension, Timescale adoption)

## 9. Deployment
- [ ] CI/CD pipelines
  - Build/test gates; artifact versioning; zero‑downtime deploys
- [ ] Environments
  - Staging parity with prod; anonymized seed data; smoke tests
- [ ] Database
  - Ordered migrations with type dependencies; backup before deploy; automated rollback
- [ ] Monitoring
  - Dashboards: heatmap query duration, cache hit ratio, recalculation counts, WS latency
  - Alerts for slow queries, WS disconnect rates, migration errors
- [ ] Rollout plan
  - Feature flags on; canary; progressive enablement; post‑deploy verification

## 10. Maintenance
- [ ] Bug triage and SLA
  - Sev classification; on‑call rotation; hotfix protocol
- [ ] Update processes
  - Dependency updates; schema versioning; deprecation policy
- [ ] Backups and retention
  - PITR; retention policy for capacity history/time entries; archival strategy
- [ ] Ongoing performance monitoring
  - Index review cadence; vacuum/analyze schedule; view refresh tuning

## Alignment and Change Requests (Critical)
- [ ] Table naming unification
  - Replace all `resource_assignments` references with `resource_allocations`
- [ ] Capacity fields consistency
  - Standardize on either `weekly_capacity` (+ derive daily) or `weekly_hours` but not both; align all views/functions/docs
- [ ] UUID generation consistency
  - Choose `gen_random_uuid()` (pgcrypto) or `uuid_generate_v4()` (uuid‑ossp) and update all migrations/docs accordingly
- [ ] Migration ordering fixes
  - Create enum types (`allocation_status`, `allocation_warning_type`) BEFORE tables/columns that use them
- [ ] Heat map color scheme normalization
  - Resolve `green/blue/yellow/red` vs `green/yellow/orange/red`; define thresholds once and reuse across BE/FE
- [ ] React Query package standardization
  - Use `@tanstack/react-query` everywhere; update imports in docs/FE
- [ ] Holiday tables nomenclature
  - Pick `holiday_calendar` (preferred) over `holidays`; unify schema, endpoints, and docs
- [ ] Function/view sources
  - Ensure all SQL views/functions reference canonical tables/columns (e.g., `resource_allocations`, not mismatched names)
- [ ] Timezone policy
  - Store timestamps in UTC; clarify date vs timestamp usage in schemas and serializers
- [ ] Security/RBAC gaps
  - Add explicit role checks for approvals, scenario apply, financial endpoints
- [ ] Caching strategy
  - Start with HTTP caching + React Query; add Redis later (as PRD "recommended optimization")
- [ ] TimescaleDB decision
  - Evaluate and, if adopted, create hypertables for time‑series heavy tables (capacity/time_entries)
- [ ] GraphQL consideration
  - Decide REST‑only vs add GraphQL for scenario comparisons; if not now, log ADR and defer
- [ ] Data retention
  - Define retention for `capacity_history`, `employee_capacity_snapshots`, `over_allocation_warnings`; indexes and partitioning strategy

## Phase Plan (Execution)
- [ ] Phase 1 (3 weeks): Heat Maps, Availability (core), Scenarios (MVP)
  - Ship with feature flags, exports, realtime updates, approval‑light
- [ ] Phase 2: Time Tracking, Notifications, Availability polish
- [ ] Phase 3: Predictive Analytics, Financials, Engagement Requests
- [ ] Phase 4: Collaboration, Skill Matching (basic first)

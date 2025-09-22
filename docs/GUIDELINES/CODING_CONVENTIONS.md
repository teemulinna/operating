## Coding Conventions (Resource Management Platform)

### Language and Versions
- TypeScript: strict mode enabled; target per repo tsconfig
- Node.js: use LTS; align with CI matrix
- React: Function components + hooks only

### Naming
- Files: kebab-case for files, PascalCase for React components (e.g., CapacityHeatMap.tsx)
- Variables/functions: camelCase; exported types/interfaces PascalCase
- Enums: PascalCase names, UPPER_SNAKE members
- Database: snake_case for tables/columns; singular for columns, plural for tables

### Typescript Rules
- No `any`; prefer precise domain types
- Narrow with guards; use discriminated unions where applicable
- Avoid optional fields that are actually required at runtime
- Public function signatures fully typed; avoid exporting `type any = unknown`
- Use `readonly` for immutable structures

### React/Frontend
- State: server state via @tanstack/react-query; UI state via local or Zustand when shared cross-tree
- Side effects in `useEffect`; memoize heavy computes with `useMemo`; event handlers with `useCallback`
- Components pure; data fetching outside components (hooks/services)
- Accessibility: form inputs labeled; keyboard focus; color contrast per WCAG 2.1 AA
- Styling: TailwindCSS + utility classes; avoid inline styles except dynamic dimensions

### Services and Modules
- Controller → Service → Repository layering; no cross-layer leaks
- DTOs validated at edges (Zod)
- Errors are domain-specific; never throw raw strings

### Error Handling
- Use typed error classes; include `code` and minimal context
- Never leak stack traces to clients; map to standard HTTP codes
### Logging
- Use structured logging (message, code, entityId, durationMs)
- No PII in logs; redact tokens/emails

### Performance
- Avoid N+1 queries; batch and index
- Prefer materialized views for heavy aggregations (heat maps)
- Frontend: virtualize long lists/grids; debounce filters (≥300ms)

### Testing Quality Bar
- Unit: fast, isolated; 80%+ coverage in core services
- Integration: DB-backed happy path + edge cases per feature
- E2E: user-critical paths for PHASE1 epics (Heatmaps, Availability, Scenarios)

### Commit and PR Hygiene
- Conventional Commits (feat, fix, chore, docs, refactor, test, perf)
- Small PRs; include screenshots for UI; link to epic/story

### Security
- Validate all inputs; escape SQL via parameters; sanitize output where relevant
- JWT validation middleware on protected routes; role checks at controllers

### Time/Date
- Store in UTC; serialize ISO 8601; convert at UI edges

### Feature Flags
- Use env-based flags for `HEATMAP`, `AVAILABILITY`, `SCENARIOS`; guard routes/UI renders

### Reference
- Aligns with docs/plan.md and PHASE1 epics; see API/DB/Test guides for specifics


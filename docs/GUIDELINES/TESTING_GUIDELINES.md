## Testing Guidelines

### Layers
- Unit: services, utilities (Jest)
- Integration: API + DB (supertest + test DB)
- E2E: Playwright critical flows

### Coverage Targets
- Services: ≥ 80%
- Controllers: key paths
- Epics: at least one E2E flow per epic (Heatmaps, Availability, Scenarios)

### Test Data
- Factories/fixtures per domain (Employee, Project, Allocation, Capacity)
- Reset DB between integration tests; truncate in FK order

### Playwright
- Use data-testid attributes; no brittle selectors
- Reports uploaded to CI artifacts

### Performance Tests
- Heatmap endpoints p95 < 2s; WS latency < 100ms (basic checks)



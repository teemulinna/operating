## Deployment Checklist (Phase 1)

### Pre-Deploy
- [ ] All tests green (unit/integration/E2E)
- [ ] Lint/typecheck pass
- [ ] Migrations reviewed; down scripts verified
- [ ] Feature flags set for target env
- [ ] Monitoring dashboards/alerts ready

### Deploy Steps
- [ ] Apply migrations (with backup)
- [ ] Deploy API, then frontend
- [ ] Warm caches (optional)
- [ ] Enable feature flag (HEATMAP → AVAILABILITY → SCENARIOS)

### Post-Deploy
- [ ] Run smoke tests
- [ ] Check dashboards (latency, errors, WS)
- [ ] Verify seed flows in staging if applicable

### Rollback
- [ ] Disable feature flags
- [ ] Run rollback migrations (to target)
- [ ] Re-deploy previous artifact



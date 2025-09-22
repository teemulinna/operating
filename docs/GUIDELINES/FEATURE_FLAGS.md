## Feature Flags (Phase 1)

### Flags
- HEATMAP: enables heat map endpoints and UI
- AVAILABILITY: enables availability patterns, exceptions, holiday calendar
- SCENARIOS: enables scenario planning endpoints and UI

### Usage
- Backend: guard routes/controllers; early return 404 if disabled
- Frontend: conditionally render nav/routes; hide controls

### Rollout Strategy
- Staged rollout: enable HEATMAP first; then AVAILABILITY; then SCENARIOS
- Canary testers; monitor metrics and error logs


